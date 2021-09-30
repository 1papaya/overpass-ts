import * as assert from "assert";
import { jsonFromFile } from "./common";
import { parseApiStatus } from "../src/utils";
import { OverpassApiStatus } from "../src/types";

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
});
