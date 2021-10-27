import type { OverpassApiStatus } from "./status";
import type { OverpassJson } from "./types";
import type { Readable } from "stream";

import { main as mainEndpoint } from "./endpoints";
import {
  checkRuntimeErrorJson,
  checkRuntimeErrorXml,
  humanReadableBytes,
  OverpassError,
  consoleMsg,
  matchAll,
  ignoreExpiredCertificatesAgent,
} from "./common";

import "isomorphic-fetch";

export interface OverpassOptions {
  /**
   * Overpass API endpoint URL (usually ends in /interpreter)
   */
  endpoint: string;
  /**
   * Output verbose query information
   */
  verbose: boolean;
  /**
   * User-agent to send on Overpass Request
   */
  userAgent: string;
}

export const defaultOverpassOptions: OverpassOptions = {
  endpoint: mainEndpoint,
  verbose: false,
  userAgent: "overpass-ts",
};

export const overpass = (
  query: string,
  overpassOpts: Partial<OverpassOptions> = {}
): Promise<Response> => {
  const opts = Object.assign({}, defaultOverpassOptions, overpassOpts);

  if (opts.verbose) {
    consoleMsg(`endpoint ${opts.endpoint}`);
    consoleMsg(`query ${query}`);
  }

  const fetchOpts = {
    body: `data=${encodeURIComponent(query)}`,
    method: "POST",
    mode: "cors",
    redirect: "follow",
    agent: ignoreExpiredCertificatesAgent,
    headers: {
      Accept: "*",
      "User-Agent": opts.userAgent,
    },
  } as RequestInit;

  return fetch(opts.endpoint, fetchOpts).then(async (resp) => {
    // throw error on non-200
    if (!resp.ok) {
      switch (resp.status) {
        case 400:
          // 400 bad request
          // if bad request, error details sent along as html
          // load the html and parse it for detailed error
          const errors = matchAll(
            /<\/strong>: ([^<]+) <\/p>/g,
            await resp.text()
          ).map((error) => error.replace(/&quot;/g, '"'));

          throw new OverpassBadRequestError(query, errors);
        case 429:
          throw new OverpassRateLimitError();
        case 504:
          throw new OverpassGatewayTimeoutError();
        default:
          throw new OverpassError(`${resp.status} ${resp.statusText}`);
      }
    }

    // print out response size if verbose
    if (opts.verbose && resp.headers.has("content-length"))
      consoleMsg(
        `response payload ${humanReadableBytes(
          parseInt(resp.headers.get("content-length") as string)
        )}`
      );

    return resp;
  });
};

export const overpassJson = (
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<OverpassJson> => {
  return overpass(query, opts)
    .then((resp) => resp.json())
    .then((json: OverpassJson) => checkRuntimeErrorJson(json));
};

export const overpassXml = (
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<string> => {
  return overpass(query, opts)
    .then((resp) => resp.text())
    .then((text) => checkRuntimeErrorXml(text));
};

export const overpassCsv = (
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<string> => {
  return overpass(query, opts).then((resp) => resp.text());
};

export const overpassStream = (
  query: string,
  opts: Partial<OverpassOptions> = {}
): Promise<Readable | ReadableStream | null> => {
  return overpass(query, opts).then((resp) => resp.body);
};

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
