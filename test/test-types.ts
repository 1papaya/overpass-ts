import * as assert from "assert";

import type {
  OverpassJson,
  OverpassOsmElement,
  OverpassTimeline,
  OverpassRelation,
  OverpassElement,
  OverpassNode,
  OverpassWay,
} from "../src/types";

import * as relations from "./examples/relation.json";
import * as timelines from "./examples/timeline.json";
import * as nodes from "./examples/node.json";
import * as ways from "./examples/way.json";

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
    });
  });
});
