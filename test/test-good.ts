import type { OverpassJson } from "../src/overpass";
import { kumi as kumiEndpoint } from "../src/endpoints";
import * as nodeStream from "stream";
import {
  overpassJson,
  overpassCsv,
  overpassXml,
  overpassStream,
} from "../src/overpass";
import * as assert from "assert";

describe("Good API Queries", function () {
  it("200 stream request", function () {
    return overpassStream(`[out:json]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: true,
    }).then((stream) => {
      assert.strictEqual(stream instanceof nodeStream.Readable, true);
    });
  });

  it("200 JSON request", function () {
    return overpassJson(`[out:json]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: true,
    }).then((json) => {
      assert.doesNotThrow(function () {
        json as OverpassJson;
      });

      console.log(json);
    });
  });

  it("200 XML request", function () {
    return overpassXml(`[out:xml]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: true,
    }).then((xml) => {
      assert.doesNotThrow(function () {
        xml as string;
      });

      console.log(xml);
    });
  });

  it("200 CSV request", function () {
    return overpassCsv(`[out:csv(::type)]; node(626639517); out geom;`, {
      endpoint: kumiEndpoint,
      verbose: true,
    }).then((xml) => {
      assert.doesNotThrow(function () {
        xml as string;
      });

      console.log(xml);
    });
  });
});
