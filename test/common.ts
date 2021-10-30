import * as fs from "fs";
import d from "debug";

export const debug = d("overpass");

export function jsonFromFile(path: string) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
}

export const smallQuery = (overpass: any) =>
  overpass.queryJson(`[out:json]; way(8675309); out geom;`);

export const bigQuery = (overpass: any) =>
  overpass.queryJson(
    `[out:json][bbox:42.50450,0.06591,42.8437,0.582];way[highway=path];out geom;`
  );
