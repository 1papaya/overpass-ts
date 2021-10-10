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
import {
  sleep,
  consoleMsg,
  OverpassError,
  endpointName,
  checkRuntimeErrorJson,
  checkRuntimeErrorXml,
} from "./common";

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
  overpassFn: OverpassFunction;
  numRetries: number;
  retryPause: number;
  verbose: boolean;
  rateLimitRetry: boolean;
  apiStatusCallback: Function;
}

const defaultManagedOptions = {
  numRetrues: 4,
  retryPause: 2000,
  verbose: true,
  rateLimitRetry: true,
  apiStatusCallback: (apiStatus: OverpassApiStatus) => {},
};

export const queryOverpass = (
  query: string,
  queryOptions: Partial<OverpassOptions> | Partial<ManagedOptions>
): Promise<Response> => {
  const opts = Object.assign(
    {},
    defaultOverpassOptions,
    defaultManagedOptions,
    queryOptions
  );

  return overpass(query, opts).catch((error: any) => {
    if (error instanceof OverpassError) {
      switch (error.constructor) {
        // if error is bad request/runtime error
        // just rethrow. not much we can do about it
        case OverpassBadRequestError:
        case OverpassRuntimeError:
          throw error;

        // if gateway timeout just sleep
        case OverpassGatewayTimeoutError:
          if (opts.verbose)
            consoleMsg(
              [
                "gateway timeout",
                endpointName(opts.endpoint),
                `pausing ${Math.round(opts.retryPause / 1000)}s`,
              ].join(" ")
            );

          return sleep(opts.retryPause).then(() => queryOverpass(query, opts));

        // if rate limited....complex logic
        case OverpassRateLimitError:
          if (opts.verbose)
            consoleMsg(["rate limited", endpointName(opts.endpoint)].join(" "));

          if (opts.rateLimitRetry) {
            const handleRateLimited = (): any =>
              apiStatus(opts.endpoint).then((apiStatus: OverpassApiStatus) => {
                opts.apiStatusCallback(apiStatus);

                // if there are more slots available than being used
                // or rate limit is 0 (unlimited), resend request immediately
                if (
                  apiStatus.rateLimit >
                    apiStatus.slotsLimited.length +
                      apiStatus.slotsRunning.length ||
                  apiStatus.rateLimit == 0
                )
                  return queryOverpass(query, opts);
                // if all slots are running, keep pinging the api status
                else if (apiStatus.slotsRunning.length == apiStatus.rateLimit) {
                  return sleep(opts.retryPause).then(() => handleRateLimited());
                }

                // if all slots are rate limited, pause until first rate limit over
                else {
                  const lowestWaitTime =
                    Math.min(
                      ...apiStatus.slotsLimited.map((slot) => slot.seconds)
                    ) + 1;

                  if (opts.verbose)
                    consoleMsg(`waiting ${lowestWaitTime}s for rate limit end`);

                  return sleep(lowestWaitTime * 1000).then(() =>
                    queryOverpass(query, opts)
                  );
                }
              });
            return handleRateLimited();
          } else throw new OverpassRateLimitError();

        // if error is of unknown type just rethrow
        default:
          throw error;
      }
    }
    // if error isn't an overpass
    else throw error;
  });
};

export const queryJson = (
  query: string,
  opts: Partial<OverpassOptions> | Partial<ManagedOptions>
): Promise<OverpassJson> =>
  queryOverpass(query, opts)
    .then((resp) => resp.json())
    .then((json: OverpassJson) => checkRuntimeErrorJson(json));

export const queryXml = (
  query: string,
  opts: Partial<OverpassOptions> | Partial<ManagedOptions>
): Promise<string> =>
  queryOverpass(query, opts)
    .then((resp) => resp.text())
    .then((xml: string) => checkRuntimeErrorXml(xml));

export const queryCsv = (
  query: string,
  opts: Partial<OverpassOptions> | Partial<ManagedOptions>
): Promise<string> => queryOverpass(query, opts).then((resp) => resp.text());

export const queryStream = (
  query: string,
  opts: Partial<OverpassOptions> | Partial<ManagedOptions>
): Promise<Readable | ReadableStream | null> =>
  queryOverpass(query, opts).then((resp) => resp.body);

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

  query(query: string, queryOpts: { overpassFn: OverpassFunction }) {
    const request: OverpassRequest = {
      endpoint: this._getBestEndpoint(),
      query: query,
    };

    return managedRequest(query);
  }

  queryJson(query: string): Promise<OverpassJson> {
    return this.query(query, { overpassFn: overpassJson });
  }

  queryXml(query: string): Promise<string> {
    return this.execute(query, overpassXml);
  }

  queryStream(query: string): Promise<Readable | ReadableStream | null> {
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
