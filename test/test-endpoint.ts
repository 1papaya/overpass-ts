import { OverpassEndpoint } from "../src/index";
import { main as mainEndpoint } from "../src/endpoints";

describe("Overpass Manager", function () {
  it("works on simple case", async function () {
    const overpass = new OverpassEndpoint(mainEndpoint, { verbose: true });

    await Promise.all([
      overpass
        .query(`[out:json]; way(8675309); out geom;`)
        .then((resp) => resp.json())
        .then((json) => console.log(json)),
      overpass.query(`[out:json]; way(8675309); out geom;`),
      overpass.query(`[out:json]; way(8675309); out geom;`),
      overpass.query(`[out:json]; way(8675309); out geom;`),
      overpass.query(`[out:json]; way(8675309); out geom;`),
      overpass.query(`[out:json]; way(8675309); out geom;`),
    ]).then(() => console.log("DONE"));
  });
});
