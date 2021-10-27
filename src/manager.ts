import { main as mainEndpoint } from "./endpoints";
import { OverpassEndpoint } from "./endpoint";
import { buildQueryObject } from "./common";

export interface OverpassManagerOptions {
  endpoints: string | string[];
  verbose: boolean;
  numRetries: number;
  retryPause: number;
  maxSlots: number;
}

const defaultOverpassManagerOptions = {
  endpoints: mainEndpoint,
  maxSlots: 4,
  numRetries: 1,
  retryPause: 2000,
  verbose: false,
};

export interface OverpassQuery {
  name?: string;
  query: string;
  options: { [key: string]: string };
}

export class OverpassManager {
  opts: OverpassManagerOptions = defaultOverpassManagerOptions;
  queue: OverpassQuery[] = [];
  queueIndex: number = 0;
  poll: NodeJS.Timeout | null = null;
  endpoints: OverpassEndpoint[] = [];

  constructor(opts: Partial<OverpassManagerOptions> = {}) {
    this.opts = Object.assign({}, defaultOverpassManagerOptions, opts);
    this.endpoints = [this.opts.endpoints]
      .flat()
      .map(
        (endpointUri) =>
          new OverpassEndpoint(endpointUri, { verbose: this.opts.verbose })
      );
  }

  async query(query: string | OverpassQuery) {
    const queryObj = buildQueryObject(query, this.queue);

    this.queue.push(queryObj);

    if (!this.poll) this.poll = setInterval(() => this._pollEndpoints(), 500);
  }

  _pollEndpoints() {
    // TODO make sure this good

    // check if there are any slots available for
    if (this.queue.length < this.queueIndex)
      clearInterval(this.poll as NodeJS.Timeout);
    else {
      for (let endpoint of this.endpoints) {
        const slotsAvailable = endpoint.getSlotsAvailable();

        if (slotsAvailable) {
          this.queueIndex++;
        }
      }
    }
  }
}
