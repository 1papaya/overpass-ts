import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        name: "overpass-ts",
        file: "dist/overpass-ts.browser.umd.js",
        format: "umd",
        exports: "auto"
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