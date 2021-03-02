import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/overpass-ts.browser.esm.js",
        format: "es"
      },
    ],
    plugins: [typescript()],
  },
  {
    input: "src/node.ts",
    output: [
      {
        name: "overpass-ts",
        file: "dist/overpass-ts.node.esm.js",
        format: "es",
      },
    ],
    external: ["node-fetch"],
    plugins: [typescript()],
  },
];