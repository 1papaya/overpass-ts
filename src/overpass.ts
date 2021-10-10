import type { OverpassJson } from "./types";
import type { OverpassApiStatus } from "./status";
import type { Readable } from "stream";

import { main as mainEndpoint } from "./endpoints";
import { apiStatus } from "./status";
import * as utils from "./utils";

import "isomorphic-fetch";

export * from "./types";

export interface OverpassOptions {
  /**
   * Overpass API endpoint URL (usually ends in /interpreter)
   */
  endpoint: string;
  /**
   * How many retries when gateway timeout before giving up?
   */
  numRetries: number;
  /**
   * Pause in between receiving a rate limited response and initiating a retry
   */
  retryPause: number;
  /**
   * Automatically retry if query is rate limited
   */
  rateLimitRetry: boolean;
  /**
   * Output verbose query information
   */
  verbose: boolean;
  /**
   * User-agent to send on Overpass Request
   */
  userAgent: string;
}

const defaultOpts: OverpassOptions = {
  endpoint: mainEndpoint,
  numRetries: 1,
  retryPause: 2000,
  rateLimitRetry: true,
  verbose: false,
  userAgent: "overpass-ts",
};

export async function overpass(
  query: string,
  overpassOpts: Partial<OverpassOptions> = {}
): Promise<Response> {
  const opts = Object.assign({}, defaultOpts, overpassOpts);

  if (opts.verbose) {
    utils.consoleMsg(`endpoint ${opts.endpoint}`);
    utils.consoleMsg(`query ${query}`);
  }

  const fetchOpts = {
    body: `data=${encodeURIComponent(query)}`,
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: {
      Accept: "*",
      "User-Agent": opts.userAgent,
    },
  } as RequestInit;

  return fetch(opts.endpoint, fetchOpts).then(async (resp) => {
    // handle non-200 errors
    if (!resp.ok) {
      if (resp.status === 400) {
        // 400 bad request

        // if bad request, error details sent along as html
        // load the html and parse it for detailed error

        const errors = utils
          .matchAll(/<\/strong>: ([^<]+) <\/p>/g, await resp.text())
          .map((error) => error.replace(/&quot;/g, '"'));

        throw new OverpassBadRequestError(query, errors);
      } else if (resp.status === 429) {
        // 429 too many requests / rate limited

        const handleRateLimited = (): Promise<Response> =>
          apiStatus(opts.endpoint).then((apiStatus: OverpassApiStatus) => {
            if (opts.verbose)
              utils.consoleMsg(
                [
                  "apiStatus",
                  ["rate limit", apiStatus.rateLimit],
                  ["slots limited", apiStatus.slotsLimited.length],
                  ["slots running", apiStatus.slotsRunning.length],
                ]
                  .flat()
                  .join(" ")
              );

            if (opts.rateLimitRetry)
              throw new OverpassRateLimitError(apiStatus);

            // if there are more slots available than being used
            // or rate limit is 0 (unlimited), resend request immediately
            if (
              apiStatus.rateLimit >
                apiStatus.slotsLimited.length + apiStatus.slotsRunning.length ||
              apiStatus.rateLimit == 0
            )
              return overpass(query, opts);
            // if all slots are running, keep pinging the api status
            else if (apiStatus.slotsRunning.length == apiStatus.rateLimit) {
              return utils
                .sleep(opts.retryPause)
                .then(() => handleRateLimited());
            }

            // if all slots are rate limited, pause until first rate limit over
            else {
              const lowestWaitTime =
                Math.min(
                  ...apiStatus.slotsLimited.map((slot) => slot.seconds)
                ) + 1;

              if (opts.verbose)
                utils.consoleMsg(
                  `waiting ${lowestWaitTime}s for rate limit end`
                );

              return utils
                .sleep(lowestWaitTime * 1000)
                .then(() => overpass(query, opts));
            }
          });

        return handleRateLimited();
      } else if (resp.status === 504) {
        // 504 gateway timeout

        if (opts.numRetries === 0) throw new OverpassGatewayTimeoutError();

        return utils
          .sleep(opts.retryPause)
          .then(() => overpass(query, utils.oneLessRetry(opts)));
      } else {
        throw new OverpassError(`${resp.status} ${resp.statusText}`);
      }
    }

    // print out response size if verbose
    if (opts.verbose && resp.headers.has("content-length"))
      utils.consoleMsg(
        `response payload ${utils.humanReadableBytes(
          parseInt(resp.headers.get("content-length") as string)
        )}`
      );

    return resp;
  });
}

export function overpassJson(
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<OverpassJson> {
  return overpass(query, opts)
    .then((resp) => resp.json())
    .then((json: OverpassJson) => {
      // https://github.com/drolbr/Overpass-API/issues/94
      // a "remark" in the output means an error occurred after
      // the HTTP status code has already been sent

      if (json.remark) throw new OverpassRuntimeError([json.remark]);
      else return json as OverpassJson;
    });
}

export function overpassXml(
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<string> {
  return overpass(query, opts)
    .then((resp) => resp.text())
    .then((text) => {
      // https://github.com/drolbr/Overpass-API/issues/94
      // a "remark" in the output means an error occurred after
      // the HTTP status code has already been sent

      // </remark> will always be at end of output, at same position
      if (text.slice(-18, -9) === "</remark>") {
        const textLines = text.split("\n");
        const errors = [];

        // loop backwards thru text lines skipping first 4 lines
        // collect each remark (there can be multiple)
        // break once remark is not matched
        for (let i = textLines.length - 4; i > 0; i--) {
          const remark = textLines[i].match(/<remark>\s*(.+)\s*<\/remark>/);
          if (remark) errors.push(remark[1]);
          else break;
        }

        throw new OverpassRuntimeError(errors);
      } else return text as string;
    });
}

export function overpassCsv(
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<string> {
  return overpass(query, opts).then((resp) => resp.text());
}

export function overpassStream(
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<Readable | ReadableStream | null> {
  return overpass(query, opts).then((resp) => resp.body);
}

// recursive function to handle rate limiting by checking
// api status and pausing / resending request accordingly
// export const handleRateLimited = (
//   query: string,
//   opts: OverpassOptions,
//   initialApiStatus: null | OverpassApiStatus = null
// ): Promise<Response> =>

export class OverpassError extends Error {
  constructor(message: string) {
    super(`Overpass Error: ${message}`);
  }
}

export class OverpassRateLimitError extends OverpassError {
  apiStatus: OverpassApiStatus | null;

  constructor(apiStatus: OverpassApiStatus | null = null) {
    super("429 Rate Limit Exceeded");

    this.apiStatus = apiStatus;
  }
}

export class OverpassBadRequestError extends OverpassError {
  errors: string[];
  query: string;

  constructor(query: string, errors: string[]) {
    super(
      [
        "400 Bad Request\n",
        "Errors:\n  ",
        errors.join("\n  "),
        "\n",
        "Query:\n  ",
        query.replace(/\n/g, "\n  "),
      ].join("")
    );
    this.errors = errors;
    this.query = query;
  }
}

export class OverpassRuntimeError extends OverpassError {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join("\n  "));
    this.errors = errors;
  }
}

export class OverpassGatewayTimeoutError extends OverpassError {
  constructor() {
    super("504 Gateway Timeout");
  }
}
