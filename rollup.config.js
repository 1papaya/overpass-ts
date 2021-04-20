import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

const removeIsometricFetchImport = replace({
  values: {
    'import "isomorphic-fetch";': "",
  },
  preventAssignment: false,
  delimiters: ["", ""],
  exclude: /node_modules/,
});

export default [
  // main bundle
  {
    input: "src/overpass-ts.ts",
    external: ["isomorphic-fetch"],
    output: {
      name: "overpass-ts",
      file: "dist/overpass-ts.js",
      format: "cjs",
      exports: "default"
    },
    plugins: [typescript()],
  },
  // browser bundle
  {
    input: "src/overpass-ts.ts",
    output: {
      name: "overpass-ts",
      file: "dist/overpass-ts.browser.js",
      format: "es",
    },
    plugins: [removeIsometricFetchImport, typescript()],
  },
  // module bundle
  {
    input: "src/overpass-ts.ts",
    external: ["isometric-fetch"],
    output: [
      {
        name: "overpass-ts",
        file: "dist/overpass-ts.module.js",
        format: "es",
      },
    ],
    plugins: [typescript()],
  },
  // standalone
  {
    input: "src/overpass-ts.ts",
    output: [
      {
        name: "overpass",
        file: "dist/overpass-ts.iife.js",
        format: "iife",
      },
    ],
    context: "window",
    plugins: [
      removeIsometricFetchImport,
      nodeResolve({ browser: true }),
      typescript(),
      commonjs(),
      terser()
    ],
  },
];
