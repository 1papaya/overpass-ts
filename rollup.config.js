import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/overpass-ts.ts",
    output: [
      {
        name: "overpass-ts",
        file: "dist/overpass-ts.js",
        format: "umd",
        exports: "default",
      },
    ],
    plugins: [typescript()],
  },
  {
    input: "src/node.ts",
    external: ["isomorphic-fetch"],
    output: {
      name: "overpass-ts",
      file: "dist/overpass-ts.node.js",
      format: "umd",
    },
    plugins: [typescript()],
  },
];
