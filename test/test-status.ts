import * as assert from "assert";
import { jsonFromFile } from "./common";
import { parseApiStatus } from "../src/utils";
import { apiStatus, OverpassApiStatusError } from "../src/overpass";
import { OverpassApiStatus } from "../src/types";
import {
  kumi as kumiEndpoint,
  switzerland as switzerlandEndpoint,
  france as franceEndpoint,
} from "../src/endpoints";

describe("Overpass API Status", function () {
  it("Parsing works correctly", function () {
    jsonFromFile("./test/examples/api-status.json").forEach(
      (statusExample: { text: string; status: OverpassApiStatus }) => {
        assert.deepStrictEqual(
          statusExample.status,
          parseApiStatus(statusExample.text)
        );
      }
    );
  });

  it("Works correctly on live data", function () {
    return apiStatus(kumiEndpoint).then((apiStatus) => {
      console.log(apiStatus);
    });
  });

  it("Broken switzerland /status endpoint errors correctly", function () {
    return apiStatus(switzerlandEndpoint).catch((error) => {
      assert(error instanceof OverpassApiStatusError);
      console.log(error.message);
    });
  });

  it("Broken france /status endpoint errors correctly", function () {
    return apiStatus(franceEndpoint).catch((error) => {
      assert(error instanceof OverpassApiStatusError);
      console.log(error.message);
    });
  });
});
