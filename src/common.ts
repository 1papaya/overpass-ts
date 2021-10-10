import { OverpassOptions } from "./overpass";
import { OverpassApiStatus } from "./status";

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

export const parseApiStatus = (statusHtml: string): OverpassApiStatus => {
  const status: any = {
    slotsRunning: [],
    slotsAvailableAfter: [],
  };

  statusHtml.split("\n").forEach((statusLine) => {
    const lineFirstWord = statusLine.split(" ")[0];
    if (lineFirstWord == "Connected") status["clientId"] = statusLine.slice(14);
    else if (lineFirstWord == "Current")
      status["currentTime"] = statusLine.slice(14);
    else if (lineFirstWord == "Rate")
      status["rateLimit"] = parseInt(statusLine.slice(12));
    else if (lineFirstWord == "Slot")
      status["slotsAvailableAfter"].push(
        [statusLine.slice(22).split(", ")].map((splitLine) => ({
          time: splitLine[0],
          seconds: parseInt(splitLine[1].split(" ")[1]),
        }))[0]
      );
    // any lines not "Currently running queries" or "# slots available now"
    // or empty, count those as slots running lines
    else if (
      lineFirstWord != "Currently" &&
      !statusLine.includes("available") &&
      statusLine !== ""
    )
      status["slotsRunning"].push(
        [statusLine.split("\t")].map((splitLine) => ({
          pid: parseInt(splitLine[0]),
          spaceLimit: parseInt(splitLine[1]),
          timeLimit: parseInt(splitLine[2]),
          startTime: splitLine[3],
        }))[0]
      );
  });

  return status;
};
