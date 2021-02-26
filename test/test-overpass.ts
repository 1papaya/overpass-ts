import type { OverpassJson } from "../src/index";
import * as nodeStream from "stream";
import overpass from "../src/index";
import * as assert from "assert";

describe("API Queries", function () {
  it("200 stream request", function () {
    return overpass(`[out:json]; node(626639517); out geom;`, {
      rateLimitRetries: 10,
      verbose: true,
      stream: true,
    }).then((stream) => {
      assert.strictEqual(stream instanceof nodeStream.Readable, true);
    });
  });

  it("200 JSON request", function () {
    return overpass(`[out:json]; node(626639517); out geom;`, {
      rateLimitRetries: 10,
      verbose: true,
    }).then((json) => {
      json = json as OverpassJson;
      assert.strictEqual("elements" in json, true);

      console.log(json);
    });
  });

  it("200 XML request", function () {
    return overpass(`[out:xml]; node(626639517); out geom;`, {
      rateLimitRetries: 10,
      verbose: true,
    }).then((xml) => {
      xml = xml as string;
      console.log(xml);
    });
  });

  it("400 bad request", function () {
    return overpass(`[out:json]; this aint gonna work`, {
      rateLimitRetries: 10,
      verbose: true,
    }).catch((error) => console.log(error.message));
  });

  it("400 bad request", function () {
    return overpass(`[out:json]; this aint gonna work`, {
      rateLimitRetries: 10,
      verbose: true,
    }).catch((error) => console.log(error.message));
  });

  it("bad url", function () {
    return overpass(`[out:json]; this aint gonna work`, {
      rateLimitRetries: 10,
      verbose: true,
      endpoint: "//aint-gonna-work",
    }).catch((error) => console.log(error.message));
  });

  it("409 too many requests", function () {
    for (let i = 0; i < 2; i++) overpass(`[out:json]; way[highway]; out geom;`);

    return overpass(`[out:json]; node(626639517); out geom;`, {
      rateLimitRetries: 10,
      verbose: true,
    })
      .then((json) => {
        console.log(json);
      })
      .catch((err) => {
        console.log(err.message);
      });
  });
});
