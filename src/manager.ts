import { apiStatus, OverpassApiStatus } from "./status";
import { overpass, overpassJson, overpassXml } from "./overpass";
import { main as mainEndpoint } from "./endpoints";
import { queryOverpass, queryJson, queryXml } from "./query";
import { OverpassJson } from "./types";
import type { Readable } from "stream";
import type { QueryOptions } from "./query";
import type { OverpassOptions } from "./overpass";
import PQueue from "../node_modules/p-queue/dist/index";
import { consoleMsg, OverpassError } from "./common";

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

// p-queue for each endpoint

export class OverpassManager {
  opts: OverpassManagerOptions = defaultOverpassManagerOptions;
  queue: [string, Partial<OverpassOptions>][] = [];
  endpoints: OverpassEndpoint[] = [];

  constructor(opts: Partial<OverpassManagerOptions>) {
    this.opts = Object.assign({}, defaultOverpassManagerOptions, opts);
  }

  // Promise.all([
  //   overpass.query("whatever", {}).then(),
  //   overpass.query("whatever2", {}).then(),
  //   overpass.query("whatever43", {}).then(),
  //   overpass.query("whatever5", {}).then(),
  // ])

  async query(
    query: string,
    opts: Partial<OverpassOptions> | Partial<QueryOptions>
  ) {
    this.queue.push([query, opts]);
  }
  _request() {}

  _getBestEndpoint(): OverpassEndpoint {
    const endpoints = this.endpoints;

    let bestEndpoint = endpoints[0];

    let rateLimited: string[] = [];
    let slotsRunning: string[] = [];

    // if only using one endpoint return that
    if (endpoints.length == 1) bestEndpoint = endpoints[0];
    else
      for (let endpoint of endpoints) {
        // highest priority if endpoint is unused
        if (endpoint.status == null) return endpoint;
        else {
          // if slots are available, use that
          // TODO implement plimit is at the max slots
          if (
            endpoint.status.rateLimit >
              endpoint.status.slotsLimited.length + slotsRunning.length ||
            (endpoint.status.rateLimit == 0 && 0 < this.opts.maxSlots)
          )
            return endpoint;
          else if (true) {
          }

          // else find the endpoint with the rate limit that will expire the soonest
        }
      }

    return bestEndpoint;
  }
}

interface OverpassEndpointOptions {
  maxSlots: number;
  verbose: boolean;
}

const defaultOverpassEndpointOptions = {
  verbose: false,
  maxSlots: 4,
};

class OverpassEndpoint {
  status: OverpassApiStatus | null = null;
  opts: OverpassEndpointOptions;
  queue: Function[] = [];
  queueIndex: number = 0;
  uri: string;
  statusTimeout: NodeJS.Timeout | null = null;

  constructor(uri: string, opts: Partial<OverpassEndpointOptions>) {
    this.opts = Object.assign({}, defaultOverpassEndpointOptions, opts);
    this.uri = uri;
  }

  _initialize() {
    return this._updateStatus().catch((error: any) => {
      throw new OverpassError(`API Status Error: ${this.uri}`);
    });
  }

  _updateStatus() {
    if (this.opts.verbose) consoleMsg(`updating status ${this.uri}`);

    return apiStatus(this.uri, { verbose: this.opts.verbose }).then(
      (apiStatus) => {
        this.status = apiStatus;

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
      }
    );
  }

  async query(
    query: string,
    overpassOpts: Partial<OverpassOptions>
  ): Promise<Response> {
    if (!this.status) await this._initialize();

    const queryIdx = this.queue.push(() =>
      overpass(query, overpassOpts)
        .then(async (resp) => {
          await this._updateStatus();
          this.queueIndex++;
          return resp;
        })
        .catch(async (error) => {
          await this._updateStatus();
          this.queueIndex++;
          throw error;
        })
    );

    return new Promise((res) => {
      const waitForQueue = () => {
        if (queryIdx <= this.queueIndex) res(this.queue[queryIdx]());
        setTimeout(waitForQueue, 100);
      };

      waitForQueue();
    });
  }

  queryJson(
    query: string,
    overpassOpts: Partial<OverpassOptions>
  ): Promise<OverpassJson> {
    return this.query(query, overpassOpts).then((resp) =>
      resp.json()
    ) as Promise<OverpassJson>;
  }

  get rateLimit(): number | null {
    return this.status
      ? this.status.rateLimit == 0
        ? this.opts.maxSlots
        : this.status.rateLimit
      : null;
  }

  get slotsAvailable(): number | null {
    return this.rateLimit && this.status
      ? this.rateLimit -
          this.status.slotsRunning.length -
          this.status.slotsLimited.length
      : 0;
  }
}
