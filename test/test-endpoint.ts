import { OverpassEndpoint } from "../src/index";
import { main as mainEndpoint } from "../src/endpoints";

describe("Overpass Manager", function () {
  it("works on simple case", async function () {
    const overpass = new OverpassEndpoint(mainEndpoint, { verbose: true });

    await Promise.all([
      overpass.queryJson(`[out:json]; way(8675309); out geom;`),
      overpass.queryXml(`[out:xml]; way(8675309); out geom;`),
      overpass.queryStream(`[out:json]; way(8675309); out geom;`),
    ]).then((res) => console.log(res));
  });
});
