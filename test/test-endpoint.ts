import { OverpassEndpoint } from "../src/index";
import {
  kumi as kumiEndpoint,
  main1 as main1Endpoint,
  france as franceEndpoint,
  usmil as usmilEndpoint,
} from "../src/endpoints";
import { debug } from "./common";

describe("Overpass Endpoint", function () {
  it("works on consecutive queries", async function () {
    const overpass = new OverpassEndpoint(main1Endpoint, {
      verbose: !!debug.enabled,
    });

    await Promise.all([
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
    ]).then((res) =>
      Promise.all([
        overpass.queryJson(`[out:json]; way(8675309); out geom;`),
        overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
        overpass.queryJson(`[out:json]; way(8675309); out geom;`),
        overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
        overpass.queryJson(`[out:json]; way(8675309); out geom;`),
        overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      ])
    );
  });

  it("works on simple quick queries main endpoint", async function () {
    const overpass = new OverpassEndpoint(main1Endpoint, {
      verbose: !!debug.enabled,
    });

    await Promise.all([
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
    ]).then((res) => console.log("DONE"));
  });

  it("works on simple quick queries kumi endpoint", async function () {
    const overpass = new OverpassEndpoint(kumiEndpoint, {
      verbose: !!debug.enabled,
    });

    await Promise.all([
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
    ]).then((res) => console.log("DONE"));
  });

  it("works on larger queries on main endpoint", async function () {
    const overpass = new OverpassEndpoint(main1Endpoint, {
      verbose: !!debug.enabled,
    });

    await Promise.all([
      overpass.queryJson(
        `[out:json][bbox:42.50450,0.06591,42.8437,0.582];way[highway=path];out geom;`
      ),
      overpass.queryJson(
        `[out:json][bbox:42.50450,0.06591,42.8437,0.582];way[highway=path];out geom;`
      ),
      overpass.queryJson(
        `[out:json][bbox:42.50450,0.06591,42.8437,0.582];way[highway=path];out geom;`
      ),
      overpass.queryJson(
        `[out:json][bbox:42.50450,0.06591,42.8437,0.582];way[highway=path];out geom;`
      ),
      overpass.queryJson(
        `[out:json][bbox:42.50450,0.06591,42.8437,0.582];way[highway=path];out geom;`
      ),
      overpass.queryJson(
        `[out:json][bbox:42.50450,0.06591,42.8437,0.582];way[highway=path];out geom;`
      ),
    ]).then((res) => console.log("DONE"));
  });

  it("works on simple quick queries usmil endpoint", async function () {
    const overpass = new OverpassEndpoint(usmilEndpoint, {
      verbose: !!debug.enabled,
    });

    await Promise.all([
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
    ]).then((res) => console.log("DONE"));
  });

  it("works on simple quick queries france endpoint", async function () {
    const overpass = new OverpassEndpoint(franceEndpoint, {
      verbose: !!debug.enabled,
    });

    await Promise.all([
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
    ]).then((res) => console.log("DONE"));
  });
});
