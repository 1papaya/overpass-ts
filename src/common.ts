import { OverpassOptions } from "./overpass";

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

export const oneLessRetry = (opts: OverpassOptions) =>
  Object.assign({}, opts, {
    numRetries: opts.numRetries - 1,
  });

export class OverpassError extends Error {
  constructor(message: string) {
    super(`Overpass Error: ${message}`);
  }
}