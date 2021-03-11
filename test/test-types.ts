import * as assert from "assert";
import * as fs from "fs";

import type {
  OverpassJson,
  OverpassOsmElement,
  OverpassTimeline,
  OverpassRelation,
  OverpassElement,
  OverpassCount,
  OverpassNode,
  OverpassWay,
} from "../src/types";

function jsonFromFile(path: string) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
}

const relations = jsonFromFile("./test/examples/relation.json");
const timelines = jsonFromFile("./test/examples/timeline.json");
const counts = jsonFromFile("./test/examples/count.json");
const nodes = jsonFromFile("./test/examples/node.json");
const ways = jsonFromFile("./test/examples/way.json");

describe("TypeScript Types", function () {
  it("JSON response type", function () {
    assert.doesNotThrow(function () {
      relations as OverpassJson;
      timelines as OverpassJson;
      nodes as OverpassJson;
      ways as OverpassJson;

      for (const rel of relations.elements) {
        rel as OverpassOsmElement;
        rel as OverpassRelation;
      }

      for (const node of nodes.elements) {
        node as OverpassOsmElement;
        node as OverpassNode;
      }

      for (const way of ways.elements) {
        way as OverpassOsmElement;
        way as OverpassWay;
      }

      for (const timeline of timelines.elements) {
        timeline as OverpassElement;
        timeline as OverpassTimeline;
      }

      for (const count of counts.elements) {
        count as OverpassElement;
        count as OverpassCount;
      }
    });
  });
});
