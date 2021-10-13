import { apiStatus, OverpassApiStatus } from "./status";
import { overpassJson, overpassXml } from "./overpass";
import { main as mainEndpoint } from "./endpoints";
import { queryOverpass, queryJson, queryXml } from "./query";
import { OverpassJson } from "./types";
import type { Readable } from "stream";
import type { QueryOptions } from "./query";
import type { OverpassOptions } from "./overpass";

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

// TODO start with only two requests per

export class OverpassManager {
  opts: OverpassManagerOptions = defaultOverpassManagerOptions;
  queue: Function[] = [];
  endpoints: {
    [endpoint: string]: {
      queue: Function[];
      status: OverpassApiStatus | null;
    };
  } = {};

  constructor(opts: Partial<OverpassManagerOptions>) {
    this.opts = Object.assign({}, defaultOverpassManagerOptions, opts);
  }

  async _initializeEndpoints() {
    return Promise.all(
      [this.opts.endpoints].flat().map((endpoint) =>
        apiStatus(endpoint, { verbose: this.opts.verbose })
          .then((status) => ({ endpoint, status }))
          .catch(() => ({ endpoint, status: null }))
      )
    )
      .then((apiStatuses) =>
        Object.assign(
          {},
          ...apiStatuses.map(({ endpoint, status }) => ({
            [endpoint]: {
              queue: [],
              status,
            },
          }))
        )
      )
      .then((initialEndpoints) => {
        this.endpoints = initialEndpoints;
        return initialEndpoints;
      });
  }

  query(
    query: string,
    opts: Partial<OverpassOptions> | Partial<QueryOptions>
  ) {}
  _request() {}

  _getBestEndpoint(): string {
    const endpoints = Object.entries(this.endpoints);

    let bestEndpoint = endpoints[0][0];

    let rateLimited: string[] = [];
    let slotsRunning: string[] = [];

    // if only using one endpoint return that
    if (endpoints.length == 1) bestEndpoint = endpoints[0][0];
    else
      for (let [endpoint, { queue, status }] of endpoints) {
        // highest priority if endpoint is unused
        if (status == null) return endpoint;
        else {
          // if slots are available, use that
          // TODO implement plimit is at the max slots
          if (
            status.rateLimit >
              status.slotsLimited.length + slotsRunning.length ||
            (status.rateLimit == 0 && 0 < this.opts.maxSlots)
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
