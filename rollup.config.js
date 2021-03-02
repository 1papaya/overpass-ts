import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [
      {
        name: "overpass-ts",
        file: "dist/overpass-ts.umd.js",
        format: "umd",
        exports: "default"
      },
    ],
    external: ["isomorphic-fetch"],
    plugins: [typescript()],
  },
];