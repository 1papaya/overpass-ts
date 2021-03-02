import typescript from "@rollup/plugin-typescript";

export default {
  external: ["isomorphic-fetch"],
  input: "src/index.ts",
  output: [
    {
      file: "dist/overpass-ts.cjs.js",
      format: "commonjs",
      exports: "auto",
      globals: {
        "isomorphic-fetch": "fetch",
      },
    },
    {
      name: "superroute",
      file: "dist/overpass-ts.esm.js",
      format: "es",
      globals: {
        "isomorphic-fetch": "fetch",
      },
    },
  ],
  plugins: [typescript()],
};
