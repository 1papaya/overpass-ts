import { apiStatus, OverpassApiStatus } from "./status";
import { overpassJson, overpassXml } from "./overpass";
import { main as mainEndpoint } from "./endpoints";
import { queryOverpass, queryJson, queryXml } from "./query";
import { OverpassJson } from "./types";
import type { Readable } from "stream";
import type { QueryOptions } from "./query";
import type { OverpassOptions } from "./overpass";

export interface OverpassManagerOptions {
  endpoint: string | string[];
  verbose: boolean;
  numRetries: number;
  retryPause: number;
  maxSlots: number;
}

const defaultOverpassManagerOptions = {
  endpoint: mainEndpoint,
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
    this.endpoints = Object.assign(
      {},
      ...[this.opts.endpoint].flat().map((endpoint) => ({
        queue: [],
        status: null,
      }))
    );
  }

  query(query: string, opts: Partial<OverpassOptions> | Partial<QueryOptions>) {

  }
  _request() {
  }

  _getBestEndpoint(): string {
    const endpoints = Object.entries(this.endpoints);

    let bestEndpoint = endpoints[0][0];

    let unused: string[] = []; // endpoints that haven't
    let rateLimited: string[] = [];
    let slotsRunning: string[] = [];
    let slotsAvailable: string[] = [];

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
