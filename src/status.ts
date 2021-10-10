import { parseApiStatus } from "./common";
import { OverpassError } from "./overpass";

export const apiStatus = (endpoint: string): Promise<OverpassApiStatus> =>
  fetch(endpoint.replace("/interpreter", "/status"))
    .then((resp) => {
      const responseType = resp.headers.get("content-type");

      if (!responseType || responseType.split(";")[0] !== "text/plain")
        throw new OverpassApiStatusError(
          `Response type incorrect (${responseType})`
        );

      return resp.text();
    })
    .then((statusHtml) => {
      const apiStatus = parseApiStatus(statusHtml);

      if (!("clientId" in apiStatus))
        throw new OverpassApiStatusError(`Unable to parse API Status`);

      return apiStatus;
    });

export interface OverpassApiStatus {
  clientId: string;
  currentTime: Date;
  rateLimit: number;
  slotsLimited: OverpassApiStatusSlotLimited[];
  slotsRunning: OverpassApiStatusSlotRunning[];
}

export interface OverpassApiStatusSlotLimited {
  time: string;
  seconds: number;
}

export interface OverpassApiStatusSlotRunning {
  pid: number;
  spaceLimit: number;
  timeLimit: number;
  startTime: string;
}

export class OverpassApiStatusError extends OverpassError {
  constructor(message: string) {
    super(`API Status error: ${message}`);
  }
}
