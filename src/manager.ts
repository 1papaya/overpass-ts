import { main as mainEndpoint } from "./endpoints";
import { OverpassEndpoint } from "./endpoint";
import { OverpassQuery, buildQueryObject } from "./common";

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

export class OverpassManager {
  opts: OverpassManagerOptions = defaultOverpassManagerOptions;
  queue: OverpassQuery[] = [];
  queueIndex: number = 0;
  poll: NodeJS.Timeout | null = null;
  endpoints: OverpassEndpoint[] = [];
  endpointsInitialized: boolean = false;

  constructor(opts: Partial<OverpassManagerOptions> = {}) {
    this.opts = Object.assign({}, defaultOverpassManagerOptions, opts);
    this.endpoints = [this.opts.endpoints]
      .flat()
      .map(
        (endpointUri) =>
          new OverpassEndpoint(endpointUri, { verbose: this.opts.verbose })
      );
  }

  async query(query: string | Partial<OverpassQuery>) {
    if (!this.endpointsInitialized) {
      this.endpointsInitialized = true;
      await Promise.all(
        this.endpoints.map((endpoint) => endpoint.updateStatus())
      );
    }

    return new Promise((res) => {
      const waitForAvailableEndpoint = () => {
        const endpoint = this._getAvailableEndpoint();
        if (endpoint) res(endpoint.query(query));
        else setTimeout(waitForAvailableEndpoint, 100);
      };

      waitForAvailableEndpoint();
    });
  }

  _getAvailableEndpoint(): OverpassEndpoint | null {
    for (let endpoint of this.endpoints) {
      const slotsAvailable = endpoint.getSlotsAvailable();

      if (slotsAvailable > 0) return endpoint;
    }

    return null;
  }
}
