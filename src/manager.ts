import { apiStatus, OverpassApiStatus } from "./status";
import {
  overpass,
  OverpassGatewayTimeoutError,
  overpassJson,
  OverpassRateLimitError,
  overpassXml,
} from "./overpass";
import { main as mainEndpoint } from "./endpoints";
import { queryOverpass, queryJson, queryXml } from "./query";
import { OverpassJson } from "./types";
import type { Readable } from "stream";
import type { QueryOptions } from "./query";
import type { OverpassOptions } from "./overpass";
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
      .map((endpointUri) => new OverpassEndpoint(endpointUri));
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

class OverpassEndpoint {
  statusTimeout: NodeJS.Timeout | null = null;
  status: OverpassApiStatus | null = null;
  opts: OverpassEndpointOptions;
  queue: OverpassQuery[] = [];
  queueIndex: number = 0;
  uri: URL;

  constructor(uri: string, opts: Partial<OverpassEndpointOptions> = {}) {
    this.opts = Object.assign({}, defaultOverpassEndpointOptions, opts);
    this.uri = new URL(uri);
  }

  _initialize() {
    return this._updateStatus().catch((error: any) => {
      throw new OverpassError(`API Status Error: ${this.uri}`);
    });
  }

  _updateStatus() {
    if (this.opts.verbose) consoleMsg(`updating status ${this.uri.origin}`);

    return apiStatus(this.uri.origin, { verbose: this.opts.verbose })
      .then((apiStatus) => {
        this.status = apiStatus;

        if (this.opts.verbose)
          console.log(
            `${this.uri.origin} status: ${apiStatus.slotsLimited} limited ${apiStatus.slotsRunning} running`
          );

        // clear status timeout it already exists
        if (this.statusTimeout) {
          clearTimeout(this.statusTimeout);
          this.statusTimeout = null;
        }

        // if there's any rate limited slots set timeout to update those
        // slots status once the rate limit is over
        if (this.status.slotsLimited.length > 0) {
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
          consoleMsg(`ERROR getting api status ${this.uri.origin}`);
      });
  }

  async query(query: string | OverpassQuery): Promise<Response> {
    if (!this.status) await this._initialize();

    const queryObj = buildQueryObject(query, this.queue);
    const queryIdx = this.queue.push(queryObj);

    if (this.opts.verbose) consoleMsg(`queued query ${queryObj.name}`);

    return new Promise((res) => {
      const waitForQueue = () => {
        if (queryIdx <= this.queueIndex) res(this._sendQuery(queryObj));
        else setTimeout(waitForQueue, 100);
      };

      waitForQueue();
    });
  }

  _sendQuery(query: OverpassQuery): Promise<Response> {
    if (this.opts.verbose)
      consoleMsg(`sending query ${query.name} ${this.uri.host}`);

    return overpass(query.query, query.options)
      .then(async (resp) => {
        await this._updateStatus();
        this.queueIndex++;
        return resp;
      })
      .catch(async (error) => {
        await this._updateStatus();

        if (error instanceof OverpassRateLimitError) {
          // if query is rate limited, poll until we get slot available
          return new Promise((res) => {
            const waitForRateLimit = () => {
              if (this.getSlotsAvailable()) res(this._sendQuery(query));
              else setTimeout(waitForRateLimit, 100);
            };

            waitForRateLimit();
          });
        } else if (error instanceof OverpassGatewayTimeoutError) {
          // if query is gateway timeout, pause some ms and send again
          return sleep(this.opts.gatewayTimeoutPause).then(() =>
            this._sendQuery(query)
          );
        } else {
          // if is other error throw it to be handled upstream
          this.queueIndex++;
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
      ? rateLimit -
          this.status.slotsRunning.length -
          this.status.slotsLimited.length
      : null;
  }
}
