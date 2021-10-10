import { apiStatus, OverpassApiStatus } from "./status";
import {
  OverpassGatewayTimeoutError,
  OverpassBadRequestError,
  defaultOverpassOptions,
  OverpassRateLimitError,
  OverpassRuntimeError,
  overpass,
} from "./overpass";

import {
  checkRuntimeErrorJson,
  checkRuntimeErrorXml,
  OverpassError,
  endpointName,
  consoleMsg,
  sleep,
} from "./common";

import type { OverpassOptions } from "./overpass";
import type { Readable } from "stream";
import type { OverpassJson } from "./types";

export interface QueryOptions {
  numRetries: number;
  retryPause: number;
  verbose: boolean;
  rateLimitRetry: boolean;
  apiStatusCallback: Function;
}

const defaultQueryOptions: QueryOptions = {
  numRetries: 4,
  retryPause: 2000,
  verbose: true,
  rateLimitRetry: true,
  apiStatusCallback: (apiStatus: OverpassApiStatus) => {},
};

export const queryOverpass = (
  query: string,
  queryOptions: Partial<OverpassOptions> | Partial<QueryOptions>
): Promise<Response> => {
  const opts = Object.assign(
    {},
    defaultOverpassOptions,
    defaultQueryOptions,
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
  opts: Partial<OverpassOptions> | Partial<QueryOptions>
): Promise<OverpassJson> =>
  queryOverpass(query, opts)
    .then((resp) => resp.json())
    .then((json: OverpassJson) => checkRuntimeErrorJson(json));

export const queryXml = (
  query: string,
  opts: Partial<OverpassOptions> | Partial<QueryOptions>
): Promise<string> =>
  queryOverpass(query, opts)
    .then((resp) => resp.text())
    .then((xml: string) => checkRuntimeErrorXml(xml));

export const queryCsv = (
  query: string,
  opts: Partial<OverpassOptions> | Partial<QueryOptions>
): Promise<string> => queryOverpass(query, opts).then((resp) => resp.text());

export const queryStream = (
  query: string,
  opts: Partial<OverpassOptions> | Partial<QueryOptions>
): Promise<Readable | ReadableStream | null> =>
  queryOverpass(query, opts).then((resp) => resp.body);
