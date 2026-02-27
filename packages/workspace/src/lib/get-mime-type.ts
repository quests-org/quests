import mime from "mime-types";
import path from "node:path";

// cspell:ignore abap, glsl, haml, haxe, objc, styl
const CODE_EXTENSION_OVERRIDES: Record<string, string> = {
  abap: "text/plain",
  ada: "text/plain",
  astro: "text/plain",
  bat: "text/plain",
  c: "text/plain",
  cjs: "text/javascript",
  clj: "text/plain",
  cljs: "text/plain",
  cmake: "text/plain",
  coffee: "text/plain",
  cpp: "text/plain",
  cs: "text/plain",
  css: "text/css",
  cts: "text/typescript",
  dart: "text/plain",
  diff: "text/plain",
  dockerfile: "text/plain",
  elm: "text/plain",
  erl: "text/plain",
  ex: "text/plain",
  exs: "text/plain",
  fish: "text/plain",
  fs: "text/plain",
  fsx: "text/plain",
  gd: "text/plain",
  gleam: "text/plain",
  glsl: "text/plain",
  go: "text/plain",
  graphql: "text/plain",
  groovy: "text/plain",
  h: "text/plain",
  haml: "text/plain",
  hbs: "text/plain",
  hpp: "text/plain",
  hs: "text/plain",
  hx: "text/plain",
  java: "text/plain",
  jl: "text/plain",
  jsx: "text/jsx",
  kt: "text/plain",
  latex: "text/plain",
  less: "text/plain",
  lisp: "text/plain",
  lua: "text/plain",
  m: "text/plain",
  makefile: "text/plain",
  md: "text/markdown",
  mdx: "text/plain",
  mjs: "text/javascript",
  ml: "text/plain",
  mts: "text/typescript",
  nim: "text/plain",
  nix: "text/plain",
  objc: "text/plain",
  pas: "text/plain",
  patch: "text/plain",
  perl: "text/plain",
  php: "text/plain",
  pl: "text/plain",
  proto: "text/plain",
  ps1: "text/plain",
  pug: "text/plain",
  py: "text/plain",
  r: "text/plain",
  rb: "text/plain",
  rs: "text/plain",
  sass: "text/plain",
  scala: "text/plain",
  scheme: "text/plain",
  scss: "text/plain",
  sh: "text/plain",
  sol: "text/plain",
  sql: "text/plain",
  styl: "text/plain",
  svelte: "text/plain",
  swift: "text/plain",
  tcl: "text/plain",
  tex: "text/plain",
  toml: "text/plain",
  ts: "text/typescript",
  tsx: "text/tsx",
  vb: "text/plain",
  vim: "text/plain",
  vue: "text/plain",
  wasm: "text/plain",
  yaml: "text/plain",
  yml: "text/plain",
  zig: "text/plain",
  zsh: "text/plain",
};

export function getMimeType(filenameOrFilePath: string) {
  const ext = path.extname(filenameOrFilePath).toLowerCase().slice(1);

  const override = CODE_EXTENSION_OVERRIDES[ext];
  if (override) {
    return override;
  }

  const mimeType = mime.lookup(filenameOrFilePath);

  if (!mimeType) {
    const basename = path.basename(filenameOrFilePath);
    const isDotfile =
      basename.startsWith(".") && !basename.slice(1).includes(".");
    if (!ext || isDotfile) {
      return "text/plain";
    }
    return "application/octet-stream";
  }

  return mimeType;
}
