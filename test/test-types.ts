import assert from "assert";
import fs from "fs";

import type {
  OverpassXml,
  OverpassJson,
  OverpassOsmElement,
  OverpassTimeline,
  OverpassRelation,
  OverpassElement,
  OverpassNode,
  OverpassWay,
} from "../src/types";

import relations from "./examples/relation.json";
import timelines from "./examples/timeline.json";
import nodes from "./examples/node.json";
import ways from "./examples/way.json";

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

  it("XML response type", function () {
    assert.doesNotThrow(function () {
      const node = fs.readFileSync("./test/examples/node.xml", {
        encoding: "utf8",
      });
      const way = fs.readFileSync("./test/examples/way.xml", {
        encoding: "utf8",
      });
      const relation = fs.readFileSync("./test/examples/relation.xml", {
        encoding: "utf8",
      });

      node as OverpassXml;
      way as OverpassXml;
      relation as OverpassXml;
    });
  });
});
