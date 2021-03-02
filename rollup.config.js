import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/overpass-ts.browser.cjs.js",
        format: "commonjs",
        exports: "auto",
      },
    ],
    plugins: [typescript()],
  },
  {
    input: "src/node.ts",
    output: [
      {
        name: "superroute",
        file: "dist/overpass-ts.node.esm.js",
        format: "es",
      },
    ],
    external: ["isometric-fetch"],
    plugins: [typescript()],
  },
];