import { describe, expect, it } from "vitest";

import { createBashDescription } from "./create-bash-env";

describe("createBashDescription", () => {
  // cspell:ignore unexpand fgrep zcat
  it("matches snapshot", () => {
    expect(createBashDescription()).toMatchInlineSnapshot(`
      "Execute bash commands in the project directory.

      IMPORTANT: This is a sandboxed environment. python and other runtimes
      are NOT available as system binaries. Do NOT attempt to run them directly.
      Use the specialized \`tsx\` command below to execute TypeScript/JavaScript files.

      IMPORTANT: Not a persistent terminal -- each call starts fresh from the project root, so \`cd .\` is always a no-op.

      TIP: Before using an unfamiliar command, run \`<command> --help\` to check its argument syntax.

      Available commands: alias, awk, base64, basename, bash, cat, chmod, clear, column, comm, cp, cut, date, diff, dirname, du, echo, egrep, env, expand, expr, false, fgrep, find, fold, grep, gunzip, gzip, head, help, history, hostname, join, ln, ls, md5sum, mkdir, mv, nl, od, paste, printenv, printf, pwd, readlink, rev, rg, rm, rmdir, sed, seq, sh, sha1sum, sha256sum, sleep, sort, split, sqlite3, stat, strings, tac, tail, tee, time, timeout, touch, tr, tree, true, unalias, unexpand, uniq, wc, whoami, xargs, zcat

      Specialized commands:
        jq - Parse and manipulate JSON
        xan - Fast CSV processing, filtering, aggregation, and visualization
        ffmpeg - Process audio and video files using FFmpeg.
        pnpm - CLI tool for managing JavaScript packages.
        tsx - Execute a TypeScript or JavaScript file. For quick one-liners, prefer -e <code> over writing a file.
        tsc - TypeScript compiler for type-checking. Do not pass individual file paths -- this bypasses tsconfig.json and skips the project's compiler settings."
    `);
  });

  it("includes just-bash built-in tools", () => {
    const description = createBashDescription();
    expect(description).toContain("grep");
    expect(description).toContain("sed");
    expect(description).toContain("awk");
    expect(description).toContain("jq");
    expect(description).toContain("diff");
  });

  it("includes all commands in a single list", () => {
    const description = createBashDescription();
    expect(description).toContain("pnpm");
    expect(description).toContain("grep");
    expect(description).toContain("jq");
  });

  it("includes the sandboxed environment warning", () => {
    const description = createBashDescription();
    expect(description).toContain("sandboxed environment");
  });
});
