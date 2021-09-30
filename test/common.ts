import * as fs from "fs";

export function jsonFromFile(path: string) {
  return JSON.parse(fs.readFileSync(path, { encoding: "utf8" }));
}
