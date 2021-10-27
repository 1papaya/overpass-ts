import { apiStatus, OverpassApiStatus } from "./status";
import {
  overpass,
  OverpassGatewayTimeoutError,
  overpassJson,
  OverpassRateLimitError,
  overpassXml,
} from "./overpass";
import { main as mainEndpoint } from "./endpoints";
import { OverpassJson } from "./types";
import { consoleMsg, OverpassError, sleep, buildQueryObject } from "./common";

export interface OverpassManagerOptions {
  endpoints: string | string[];
  verbose: boolean;
  numRetries: number;
  retryPause: number;
  maxSlots: number;
}

const defaultOverpassManagerOptions = {
  endpoints: mainEndpoint,
  maxSlots: 4,
  numRetries: 1,
  retryPause: 2000,
  verbose: false,
};

export interface OverpassQuery {
  name?: string;
  query: string;
  options: { [key: string]: string };
}

export class OverpassManager {
  opts: OverpassManagerOptions = defaultOverpassManagerOptions;
  queue: OverpassQuery[] = [];
  queueIndex: number = 0;
  poll: NodeJS.Timeout | null = null;
  endpoints: OverpassEndpoint[] = [];

  constructor(opts: Partial<OverpassManagerOptions> = {}) {
    this.opts = Object.assign({}, defaultOverpassManagerOptions, opts);
    this.endpoints = [this.opts.endpoints]
      .flat()
      .map(
        (endpointUri) =>
          new OverpassEndpoint(endpointUri, { verbose: this.opts.verbose })
      );
  }

  async query(query: string | OverpassQuery) {
    const queryObj = buildQueryObject(query, this.queue);

    this.queue.push(queryObj);

    if (!this.poll) this.poll = setInterval(() => this._pollEndpoints(), 500);
  }

  _pollEndpoints() {
    // TODO make sure this good

    // check if there are any slots available for
    if (this.queue.length < this.queueIndex)
      clearInterval(this.poll as NodeJS.Timeout);
    else {
      for (let endpoint of this.endpoints) {
        const slotsAvailable = endpoint.getSlotsAvailable();

        if (slotsAvailable) {
          this.queueIndex++;
        }
      }
    }
  }
}

interface OverpassEndpointOptions {
  gatewayTimeoutPause: number;
  maxSlots: number;
  verbose: boolean;
}

const defaultOverpassEndpointOptions = {
  gatewayTimeoutPause: 2000,
  verbose: false,
  maxSlots: 4,
};

export class OverpassEndpoint {
  statusTimeout: NodeJS.Timeout | null = null;
  status: OverpassApiStatus | null | false = null;
  opts: OverpassEndpointOptions;
  queue: OverpassQuery[] = [];
  queueIndex: number = 0;
  queueRunning: number = 0;
  uri: URL;

  constructor(uri: string, opts: Partial<OverpassEndpointOptions> = {}) {
    this.opts = Object.assign({}, defaultOverpassEndpointOptions, opts);
    this.uri = new URL(uri);
  }

  _initialize() {
    if (this.opts.verbose) consoleMsg(`${this.uri.host} initialize`);
    this.status = false;

    return this._updateStatus().catch((error: any) => {
      throw new OverpassError(`API Status Error: ${this.uri}`);
    });
  }

  _updateStatus() {
    return apiStatus(this.uri.href, { verbose: this.opts.verbose })
      .then((apiStatus) => {
        this.status = apiStatus;

        // clear status timeout it already exists
        if (this.statusTimeout) {
          clearTimeout(this.statusTimeout);
          this.statusTimeout = null;
        }

        // if there's any rate limited slots and something in the queue
        // set timeout to update those slots status once the rate limit is over
        if (
          this.status.slotsLimited.length > 0 &&
          this.queueIndex < this.queue.length
        ) {
          const lowestRateLimitSeconds =
            Math.min(...this.status.slotsLimited.map((slot) => slot.seconds)) +
            1;

          this.statusTimeout = setTimeout(async () => {
            await this._updateStatus();
          }, lowestRateLimitSeconds * 1000);
        }
      })
      .catch((error) => {
        // silently error apiStatus (some endpoints don't support /api/status)
        if (this.opts.verbose)
          consoleMsg(
            `ERROR getting api status ${this.uri.origin} (${error.message})`
          );

        // set status to false if status endpoint broken
        // make sure we don't ask again
        this.status = false;
      });
  }

  async query(query: string | OverpassQuery): Promise<Response> {
    if (!this.status && this.status !== false) await this._initialize();

    const queryObj = buildQueryObject(query, this.queue);
    const queryIdx = this.queue.push(queryObj);

    if (this.opts.verbose)
      consoleMsg(`${this.uri.host} query ${queryObj.name} queued`);

    return new Promise((res) => {
      const waitForQueue = () => {
        if (
          queryIdx <=
          this.queueIndex + (this.getSlotsAvailable() as number)
        ) {
          this.queueIndex++;
          this.queueRunning++;
          res(this._sendQuery(queryObj));
        } else setTimeout(waitForQueue, 100);
      };

      waitForQueue();
    });
  }

  _sendQuery(query: OverpassQuery): Promise<Response> {
    if (this.opts.verbose)
      consoleMsg(`${this.uri.host} query ${query.name} sending`);

    return overpass(query.query, query.options)
      .then(async (resp) => {
        if (this.opts.verbose)
          consoleMsg(`${this.uri.host} query ${query.name} complete`);

        await this._updateStatus();
        this.queueRunning--;

        return resp;
      })
      .catch(async (error) => {
        await this._updateStatus();

        if (error instanceof OverpassRateLimitError) {
          // if query is rate limited, poll until we get slot available
          if (this.opts.verbose)
            consoleMsg(`${this.uri.host} query ${query.name} rate limited`);

          return new Promise((res) => {
            const waitForRateLimit = () => {
              if (this.getSlotsAvailable()) res(this._sendQuery(query));
              else setTimeout(waitForRateLimit, 100);
            };

            waitForRateLimit();
          });
        } else if (error instanceof OverpassGatewayTimeoutError) {
          // if query is gateway timeout, pause some ms and send again
          if (this.opts.verbose)
            consoleMsg(`${this.uri.host} query ${query.name} gateway timeout`);

          return sleep(this.opts.gatewayTimeoutPause).then(() =>
            this._sendQuery(query)
          );
        } else {
          // if is other error throw it to be handled upstream

          if (this.opts.verbose)
            consoleMsg(
              `${this.uri.host} query ${query.name} uncaught error (${error.message})`
            );

          //this.queueIndex++;
          this.queueRunning--;
          throw error;
        }
      });
  }

  queryJson(query: string | OverpassQuery): Promise<OverpassJson> {
    return this.query(query).then((resp) =>
      resp.json()
    ) as Promise<OverpassJson>;
  }

  getRateLimit(): number | null {
    return this.status
      ? this.status.rateLimit == 0
        ? this.opts.maxSlots
        : this.status.rateLimit
      : null;
  }

  getSlotsAvailable(): number | null {
    const rateLimit = this.getRateLimit();

    return rateLimit && this.status
      ? rateLimit - this.queueRunning - this.status.slotsLimited.length
      : null;
  }
}
