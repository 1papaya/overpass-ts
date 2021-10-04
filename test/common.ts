import * as fs from "fs";
import d from "debug";

export const debug = d("overpass");

export function jsonFromFile(path: string) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
}
