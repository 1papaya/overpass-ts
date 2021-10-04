import * as assert from "assert";
import { kumi as kumiEndpoint } from "../src/endpoints";
import {
  OverpassBadRequestError,
  OverpassRuntimeError,
  OverpassError,
  overpassJson,
  overpassXml
} from "../src/overpass";

import { debug } from "./common";

describe("Error API Queries", function () {
  it("errors correctly on 400 bad request", function () {
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

  it("errors correctly on json query with remark", function () {
    return overpassJson(`[out:json][timeout:1];rel[route=hiking];>;way._;out;`, {
      endpoint: kumiEndpoint,
      verbose: !!debug.enabled
    }).then(
      () => {
        assert(false);
      },
      (error) => {
        debug(error);
        assert(error instanceof OverpassRuntimeError);
      }
    );
  });

  it("errors correctly on xml query with remark", function () {
    return overpassXml(`[out:xml][timeout:1];rel[route=hiking];>;way._;out;`, {
      endpoint: kumiEndpoint,
      verbose: !!debug.enabled
    }).then(
      () => {
        assert(false);
      },
      (error) => {
        debug(error);
        assert(error instanceof OverpassRuntimeError);
      }
    );
  });

  it("errors correctly on bad url", function () {
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
