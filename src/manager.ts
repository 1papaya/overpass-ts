import { main as mainEndpoint } from "./endpoints";
import { OverpassJson } from "./types";
import { overpass, defaultOverpassOptions, OverpassOptions } from "./overpass";
import type { Readable } from "stream";
import {
  overpassJson,
  overpassXml,
  overpassStream,
  OverpassGatewayTimeoutError,
  OverpassBadRequestError,
  OverpassRateLimitError,
  OverpassRuntimeError,
} from "./overpass";

import { apiStatus, OverpassApiStatus } from "./status";
import { sleep, consoleMsg, OverpassError, endpointName } from "./common";

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

export interface OverpassRequest {
  endpoint: string;
  query: string;
  overpassFn: OverpassFunction;
}

export type OverpassFunction =
  | typeof overpassJson
  | typeof overpassXml
  | typeof overpassStream;

export interface ManagedOptions {
  numRetries: number;
  retryPause: number;
  verbose: boolean;
}

const defaultManagedOptions = {
  numRetrues: 4,
  retryPause: 2000,
  verbose: true,
};

export const managedRequest = (
  query: string,
  overpassOpts: Partial<OverpassOptions> = {},
  managedOpts: Partial<ManagedOptions> = {}
): Promise<Response> => {
  const opts = {
    overpass: Object.assign({}, defaultOverpassOptions, overpassOpts),
    managed: Object.assign({}, defaultManagedOptions, managedOpts),
  };

  return overpass(query, overpassOpts).catch((error: any) => {
    if (error instanceof OverpassError) {
      switch (error.constructor) {
        // if error is bad request/runtime error
        // just rethrow. not much we can do about it
        case OverpassBadRequestError:
        case OverpassRuntimeError:
          throw error;

        // if gateway timeout just sleep
        case OverpassGatewayTimeoutError:
          if (managedOpts.verbose)
            consoleMsg(
              [
                "gateway timeout",
                endpointName(opts.overpass.endpoint),
                `pausing ${Math.round(opts.managed.retryPause / 1000)}s`,
              ].join(" ")
            );

          return sleep(opts.managed.retryPause).then(() =>
            managedRequest(query, overpassOpts, managedOpts)
          );

        // if rate limited....complex logic
        case OverpassRateLimitError:
          if (opts.managed.verbose)
            consoleMsg(
              ["rate limited", endpointName(opts.overpass.endpoint)].join(" ")
            );

        //return null;//handleRateLimited(query, overpassOpts, managedOpts);

        // if error is of unknown type just rethrow
        default:
          throw error;
      }
    }
    // if error isn't an overpass
    else throw error;
  });
};

export class OverpassManager {
  opts: OverpassManagerOptions = defaultOverpassManagerOptions;
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

  execute(query: string, overpassFn: OverpassFunction) {
    const request: OverpassRequest = {
      endpoint: this._getBestEndpoint(),
      query: query,
      overpassFn: overpassFn,
    };

    return this._request(request);
  }

  executeJson(query: string): Promise<OverpassJson> {
    return this.execute(query, overpassJson);
  }

  executeXml(query: string): Promise<string> {
    return this.execute(query, overpassXml);
  }

  executeStream(query: string): Promise<Readable | ReadableStream | null> {
    return this.execute(query, overpassXml);
  }

  _endpointName(endpoint: string): string {
    return new URL(endpoint).hostname;
  }

  _request(request: OverpassRequest) {
    return request.overpassFn(request.query, {
      endpoint: request.endpoint,
    }) as any;

    // return Promise.all([
    //   Promise.resolve(request.endpoint),
    //   Promise.resolve(request.query),
    //   Promise.resolve(request.overpassFn),
    //   request.overpassFn(request.query, { endpoint: request.endpoint }) as any,
    // ]);
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
