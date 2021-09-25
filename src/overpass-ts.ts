import type { OverpassJson, OverpassResponse, OverpassOptions } from "./types";
import type { Readable } from "stream";

import "isomorphic-fetch";
import { humanReadableBytes, matchAll, sleep } from "./utils";

export * from "./types";

const defaultOpts: OverpassOptions = {
  endpoint: "//overpass-api.de/api/interpreter",
  rateLimitRetries: 2,
  rateLimitPause: 2000,
  verbose: false,
  stream: false,
  fetchOpts: {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: {
      Accept: "*",
      "User-Agent": "overpass-ts",
    },
  },
};

export function overpass(
  query: string,
  opts: OverpassOptions = {}
): Promise<OverpassResponse | Readable | ReadableStream> {
  let { fetchOpts, ...overpassOpts } = JSON.parse(JSON.stringify(opts));
  let body = `data=${encodeURIComponent(query)}`;

  // full overwrite of fetch options if specificed by user
  fetchOpts =
    typeof fetchOpts === "undefined"
      ? Object.assign({ body }, defaultOpts.fetchOpts)
      : Object.assign({ body }, opts.fetchOpts);

  // merge passed options with default opts
  if (typeof overpassOpts !== "undefined")
    overpassOpts = Object.assign({}, defaultOpts, overpassOpts);

  if (opts.verbose) {
    console.debug(`endpoint: ${overpassOpts.endpoint}`);
    console.debug(`query: ${query}`);
  }

  return fetch(overpassOpts.endpoint as string, fetchOpts).then(
    async (resp) => {
      if (resp.ok) {
        // status = 200
        if (overpassOpts.verbose && resp.headers.has("content-length"))
          console.debug(
            `payload: ${humanReadableBytes(
              parseInt(resp.headers.get("content-length") as string)
            )}`
          );

        if (overpassOpts.stream) return resp.body;

        if (resp.headers.get("content-type") === "application/json") {
          const json = await resp.json();

          if (!!json && "remark" in json && opts.verbose)
            console.debug(json.remark);

          return json;
        } else {
          return resp.text();
        }
      } else {
        if (resp.status === 400) {
          // bad request
          const errorHtml = await resp.text();
          const errors = matchAll(/<\/strong>: ([^<]+) <\/p>/g, errorHtml);

          throw new Error(
            ["400 Bad Request", "Query:", query, "Errors:", ...errors].join(
              "\n"
            )
          );
        } else if (resp.status === 429 || resp.status === 504) {
          // retry if too many requests / gateway timeout

          if (overpassOpts.rateLimitRetries === 0)
            throw new OverpassError(
              `${resp.status} ${resp.statusText}. Retries Exhausted.`
            );

          if (overpassOpts.verbose)
            console.debug(
              `${resp.status} ${resp.statusText}. Retry #${overpassOpts.rateLimitRetries}`
            );

          return sleep(overpassOpts.rateLimitPause as number).then(async () =>
            overpass(
              query,
              Object.assign({}, opts, {
                rateLimitRetries: (overpassOpts.rateLimitRetries as number) - 1,
              })
            )
          );
        } else {
          throw new OverpassError(`${resp.status} ${resp.statusText}`);
        }
      }
    }
  );
}

export function overpassJson(
  query: string,
  opts: OverpassOptions = {}
): Promise<OverpassResponse | Readable | ReadableStream> {
  return overpass(query, opts).then((resp) => resp as OverpassJson);
}

export function overpassXml(
  query: string,
  opts: OverpassOptions = {}
): Promise<OverpassResponse | Readable | ReadableStream> {
  return overpass(query, opts).then((resp) => resp as string);
}

export function overpassStream(
  query: string,
  opts: OverpassOptions = {}
): Promise<OverpassResponse | Readable | ReadableStream> {
  return overpass(query, opts).then((resp) => resp as string);
}

class OverpassError extends Error {
  constructor(message: string) {
    super(`Overpass Error: ${message}`);
  }
}
