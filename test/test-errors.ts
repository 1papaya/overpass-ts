import type { OverpassJson } from "../src/overpass-ts";
import { kumi as kumiEndpoint } from "../src/endpoints";
import * as nodeStream from "stream";
import {
  overpassJson,
  overpassCsv,
  overpassXml,
  overpassStream,
} from "../src/overpass-ts";
import * as assert from "assert";

describe("Error API Queries", function () {
  it("400 bad request", function () {
    return overpassJson(`[out:json]; this aint gonna work`, {
      endpoint: kumiEndpoint,
      verbose: true,
    }).catch((error) => console.log(error.message));
  });

  it("bad url", function () {
    return overpassJson(`[out:json]; this aint gonna work`, {
      verbose: true,
      endpoint: "//aint-gonna-work",
    }).catch((error) => console.log(error.message));
  });
});
