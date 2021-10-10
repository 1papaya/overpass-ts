import type { OverpassJson } from "../src/types";
import { kumi as kumiEndpoint } from "../src/endpoints";
import * as nodeStream from "stream";
import * as assert from "assert";
import {
  overpassJson,
  overpassCsv,
  overpassXml,
  overpassStream,
} from "../src/overpass";

import { debug } from "./common";

describe("Good API Queries", function () {
  it("200 stream request", function () {
    return overpassStream(`[out:json]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: !!debug.enabled
    }).then((stream) => {
      assert.strictEqual(stream instanceof nodeStream.Readable, true);
    });
  });

  it("200 JSON request", function () {
    return overpassJson(`[out:json]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: !!debug.enabled
    }).then((json) => {
      assert.doesNotThrow(function () {
        json as OverpassJson;
      });

      debug(json);
    });
  });

  it("200 XML request", function () {
    return overpassXml(`[out:xml]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: !!debug.enabled
    }).then((xml) => {
      assert.doesNotThrow(function () {
        xml as string;
      });

      debug(xml);
    });
  });

  it("200 CSV request", function () {
    return overpassCsv(`[out:csv(::type)]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: !!debug.enabled
    }).then((xml) => {
      assert.doesNotThrow(function () {
        xml as string;
      });

      debug(xml);
    });
  });
});
