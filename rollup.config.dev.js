import resolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import babel from "rollup-plugin-babel";
import serve from "rollup-plugin-serve";
import { terser } from "rollup-plugin-terser";
import json from '@rollup/plugin-json';
import summary from 'rollup-plugin-summary';


export default {
  input: ["src/fluid-level-background-card.ts"],
  output: {
    dir: "./dist",
    format: "es",
  },
  plugins: [
    resolve(),
    typescript(),
    json(),
    babel({
      exclude: "node_modules/**",
    }),
    terser(),
    summary(),
    serve({
      contentBase: "./dist",
      host: "0.0.0.0",
      port: 5000,
      allowCrossOrigin: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }),
  ],
};
