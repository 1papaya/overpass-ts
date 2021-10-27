import { OverpassQuery } from "./manager";
import { OverpassRuntimeError } from "./overpass";
import { OverpassJson } from "./types";

export const humanReadableBytes = (bytes: number) => {
  return bytes > 1024 * 1024
    ? `${Math.round((bytes / (1024 * 1024)) * 100) / 100}MiB`
    : `${Math.round((bytes / 1024) * 100) / 100}KiB`;
};

export const matchAll = (regex: RegExp, string: string) => {
  let match,
    matches = [];
  while ((match = regex.exec(string))) matches.push(match[1]);

  return matches;
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const consoleMsg = (msg: string) => {
  console.log(`Overpass: ${msg}`);
};

// export const oneLessRetry = (opts: OverpassOptions) =>
//   Object.assign({}, opts, {
//     numRetries: opts.numRetries - 1,
//   });

export class OverpassError extends Error {
  constructor(message: string) {
    super(`Overpass Error: ${message}`);
  }
}

export const endpointName = (endpoint: string): string => {
  return new URL(endpoint).hostname;
};

export const checkRuntimeErrorJson = (json: OverpassJson): OverpassJson => {
  // https://github.com/drolbr/Overpass-API/issues/94
  // a "remark" in the output means an error occurred after
  // the HTTP status code has already been sent

  if (json.remark) throw new OverpassRuntimeError([json.remark]);
  else return json as OverpassJson;
};

export const checkRuntimeErrorXml = (text: string): string => {
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
};

export const buildQueryObject = (
  query: string | OverpassQuery,
  queue: OverpassQuery[]
): OverpassQuery => {
  // build query object if we just get query string
  if (typeof query === "string")
    return {
      name: queue.length.toString(),
      query: query,
      options: {},
    };
  // generate name based upon query idx if it's not given
  else if (!("name" in query)) {
    return Object.assign({}, query, {
      name: queue.length.toString(),
    });
  }
  // otherwise it's a complete query object
  else return query;
};
