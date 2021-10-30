import { OverpassManager } from "../src/index";
import {
  main1,
  main2,
  kumi,
  usmil,
  france,
  switzerland,
} from "../src/endpoints";
import { bigQuery } from "./common";

describe("Overpass Manager", function () {
  it("works on simple case", function () {
    const overpass = new OverpassManager({
      endpoints: [main1, main2, kumi],
      verbose: true,
    });

    return Promise.all([
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
      bigQuery(overpass),
    ]);
  });
});
