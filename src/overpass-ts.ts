import type { OverpassResponse } from "./types";
import type { Readable } from "stream";

export * from "./types";

interface OverpassOptions {
  /**
   * Overpass API endpoint URL (usually ends in /interpreter)
   */
  endpoint?: string;
  /**
   * How many retries when rate limit/gateway timeout before giving up?
   */
  rateLimitRetries?: number;
  /**
   * Pause in between receiving a rate limited response and initiating a retry
   */
  rateLimitPause?: number;
  /**
   * Output verbose query information
   */
  verbose?: boolean;
  /**
   * Return a stream.Readable (in Node) or ReadableStream (in browser)
   */
  stream?: boolean;
  /**
   * Options to be passed to fetch, will overwrite all defaults
   */
  fetchOpts?: object;
}

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

export default function overpass(
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
            `payload: ${_humanReadableBytes(
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
          const errors = _matchAll(/<\/strong>: ([^<]+) <\/p>/g, errorHtml);

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

          return _sleep(overpassOpts.rateLimitPause as number).then(async () =>
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

class OverpassError extends Error {
  constructor(message: string) {
    super(`Overpass Error: ${message}`);
  }
}

const _humanReadableBytes = (bytes: number) => {
  return bytes > 1024 * 1024
    ? `${Math.round((bytes / (1024 * 1024)) * 100) / 100}MiB`
    : `${Math.round((bytes / 1024) * 100) / 100}KiB`;
};

const _matchAll = (regex: RegExp, string: string) => {
  let match,
    matches = [];
  while ((match = regex.exec(string))) matches.push(match[1]);

  return matches;
};

function _sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
