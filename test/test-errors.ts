import * as assert from "assert";
import { kumi as kumiEndpoint } from "../src/endpoints";
import {
  OverpassBadRequestError,
  OverpassError,
  overpassJson,
} from "../src/overpass";

import { debug } from "./common";

describe("Error API Queries", function () {
  it("400 bad request", function () {
    return overpassJson(`[out:json]; this aint gonna work`, {
      endpoint: kumiEndpoint,
      verbose: !!debug.enabled
    }).then(
      () => {
        assert(false);
      },
      (error) => {
        debug(error);
        assert(error instanceof OverpassBadRequestError);
      }
    );
  });

  it("bad url", function () {
    return overpassJson(`[out:json]; this aint gonna work`, {
      endpoint: "//aint-gonna-work",
      verbose: !!debug.enabled
    }).then(
      () => assert(false),
      (error) => {  
        debug(error);
        assert(!(error instanceof OverpassError));
      }
    );
  });
});
