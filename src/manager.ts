import { main as mainEndpoint } from "./endpoints";
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
import { sleep, consoleMsg, OverpassError } from "./common";

export interface OverpassManagerOptions {
  endpoint: string | string[];
  verbose: boolean;
  numRetries: number;
  retryPause: number;
}

export interface OverpassRequest {
  endpoint: string;
  query: string;
  overpassFn: typeof overpassJson | typeof overpassXml | typeof overpassStream;
}

const defaultOverpassManagerOptions = {
  endpoint: mainEndpoint,
  numRetries: 1,
  retryPause: 2000,
  verbose: false,
};

export class OverpassManager {
  opts: OverpassManagerOptions = defaultOverpassManagerOptions;
  endpoints: string[] = [];
  queue: { [endpoint: string]: Function } = {};
  status: { [endpoint: string]: OverpassApiStatus } = {};

  constructor(opts: Partial<OverpassManagerOptions>) {
    this.opts = Object.assign({}, defaultOverpassManagerOptions, opts);
    this.endpoints = [this.opts.endpoint].flat();
    this.status = Object.assign(
      {},
      ...this.endpoints.map((endpoint) => ({ [endpoint]: {} }))
    );
    this.queue = Object.assign(
      {},
      ...this.endpoints.map((endpoint) => ({ [endpoint]: {} }))
    );
  }

  execute(query: string, response: "xml" | "stream" | "json" = "json") {
    const request: OverpassRequest = {
      endpoint: this._getBestEndpoint(),
      query: query,
      overpassFn:
        response == "xml"
          ? overpassXml
          : response == "stream"
          ? overpassStream
          : overpassJson,
    };

    this.queue.push(() =>
      this._request(request).catch((error: any) => {
        if (error instanceof OverpassError) {
          switch (error.constructor) {
            // if error is bad request/runtime error
            // just rethrow. not much we can do about it
            case OverpassBadRequestError:
            case OverpassRuntimeError:
              throw error;

            // if gateway timeout just sleep
            case OverpassGatewayTimeoutError:
              if (this.opts.verbose)
                consoleMsg(
                  [
                    "gateway timeout",
                    this._endpointName(request.endpoint),
                    `pausing ${Math.round(this.opts.retryPause / 1000)}s`,
                  ].join(" ")
                );

              return sleep(this.opts.retryPause).then(() =>
                this._request(request)
              );

            // if rate limited....complex logic
            case OverpassRateLimitError:
              if (this.opts.verbose)
              consoleMsg(
                [
                  "rate limited",
                  this._endpointName(request.endpoint),
                ].join(" ")
              );

              return this._handleRateLimited(request);

            // if error is of unknown type just rethrow
            default:
              throw error;
          }
        }
        // if error isn't an overpass
        else throw error;
      })
    );
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
    if (this.endpoints.length == 1) return this.endpoints[0];
    else return this.endpoints[0];
    // TODO complex logic to check endpoint statuses etc
  }

  _handleRateLimited(request: OverpassRequest): Promise<Response> {
    return apiStatus(request.endpoint).then((apiStatus: OverpassApiStatus) => {
      if (this.opts.verbose)
        consoleMsg(
          [
            "apiStatus",
            ["rate limit", apiStatus.rateLimit],
            ["slots limited", apiStatus.slotsLimited.length],
            ["slots running", apiStatus.slotsRunning.length],
          ]
            .flat()
            .join(" ")
        );

      // if there are more slots available than being used
      // or rate limit is 0 (unlimited), resend request immediately
      if (
        apiStatus.rateLimit >
          apiStatus.slotsLimited.length + apiStatus.slotsRunning.length ||
        apiStatus.rateLimit == 0
      )
        return this._request(request);
      // if all slots are running, keep pinging the api status
      else if (apiStatus.slotsRunning.length == apiStatus.rateLimit) {
        return sleep(this.opts.retryPause).then(() =>
          this._handleRateLimited(request)
        );
      }

      // if all slots are rate limited, pause until first rate limit over
      else {
        const lowestWaitTime =
          Math.min(...apiStatus.slotsLimited.map((slot) => slot.seconds)) + 1;

        if (this.opts.verbose)
          consoleMsg(`waiting ${lowestWaitTime}s for rate limit end`);

        return sleep(lowestWaitTime * 1000).then(() => this._request(request));
      }
    });
  }
}
