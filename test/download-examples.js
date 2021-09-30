const fs = require("fs");
const fetch = require("isomorphic-fetch");

const date = "2021-02-22T16:20:00Z";

const outDir = "./test/examples";

const outTypes = [
  "ids",
  "skel",
  "body",
  "tags",
  "meta",
  "geom",
  "bb",
  "center",
];

const testElements = {
  node: 626639517,
  way: 8675309,
  relation: 62761,
};

const sleep = function (s) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
};

const overpassToDisk = async function (
  query,
  outFile,
  includeResponseInfo = false
) {
  if (fs.existsSync(outFile)) {
    console.log(`${outFile} exists. skipping...`);
    return;
  }

  console.log(`sending: ${query}`);

  return fetch("//overpass-api.de/api/interpreter", {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: {
      Accept: "application/json",
      "User-Agent": "overpass-ts",
    },
    body: `data=${encodeURIComponent(query)}`,
  })
    .then((resp) => {
      if (includeResponseInfo) {
        const responseInfo = {
          type: resp.type,
          url: resp.url,
          statusText: resp.statusText,
          status: resp.status,
          redirected: resp.redirected,
          headers: Object.assign(
            ...Array.from(resp.headers.entries()).map((header) => {
              return { [header[0]]: header[1] };
            })
          ),
        };

        fs.appendFileSync(
          outFile,
          `${JSON.stringify(responseInfo, null, 2)}\n\n`
        );
      }

      return resp.text();
    })
    .then((data) => {
      fs.appendFileSync(outFile, data);
      console.log(`wrote ${outFile}`);
      return 1;
    })
    .then(async () => {
      await sleep(10);
    });
};

(async function () {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // node, way, relation examples
  for (const format of ["json", "xml"]) {
    for (const testElement of Object.entries(testElements)) {
      await overpassToDisk(
        `[out:${format}][date:"${date}"];
      ${testElement[0]}(id:${testElement[1]});
      out ${outTypes.join("; out ")};`,
        `${outDir}/${testElement[0]}.${format}`
      );
    }
  }

  // timeline examples

  await Promise.all(
    ["json", "xml"].map((outType) =>
      overpassToDisk(
        `[out:${outType}][date:"${date}"];
       timeline(node, ${testElements["node"]});
       timeline(way, ${testElements["way"]});
       timeline(relation, ${testElements["relation"]}); out;`,
        `${outDir}/timeline.${outType}`
      )
    )
  );

  // bad request example
  await overpassToDisk(
    `[out:xml]; this aint gonna work`,
    `${outDir}/400-bad-request.txt`,
    true
  );

  // out count

  await Promise.all(
    ["json", "xml"].map((outType) =>
      overpassToDisk(
        `[out:${outType}]; node(${testElements["node"]}); out count;`,
        `${outDir}/count.${outType}`
      )
    )
  );

  // timeout example

  await Promise.all(
    ["json", "xml"].map((outType) =>
      overpassToDisk(
        `[out:${outType}][timeout:1]; way[highway]; out geom;`,
        `${outDir}/timeout.${outType}`,
        true
      )
    )
  );

  overpassToDisk(
    `[out:xml]; node(${testElements["node"]}); out geom;`,
    `${outDir}/429-too-many-requests.txt`,
    true
  );
})();
