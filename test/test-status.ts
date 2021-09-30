import * as assert from "assert";
import { jsonFromFile } from "./common";
import { parseApiStatus } from "../src/utils";
import { apiStatus, OverpassApiStatusError } from "../src/overpass-ts";
import { OverpassApiStatus } from "../src/types";
import {
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
