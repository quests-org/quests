import { describe, expect, it } from "vitest";

import { createBashDescription } from "./create-bash-env";

describe("createBashDescription", () => {
  // cspell:ignore unexpand
  it("matches snapshot", () => {
    expect(createBashDescription()).toMatchInlineSnapshot(`
      "Execute bash commands in the project directory.

      IMPORTANT: This is a sandboxed environment. node, npm, python, and other runtimes are
      NOT available. Do NOT attempt to run them.

      Available commands: awk, cat, column, comm, cut, diff, expand, find, fold, grep, head, join, nl, od, paste, printf, rev, sed, sort, split, strings, tail, tee, tr, unexpand, uniq, wc, xargs

      Specialized commands:
        jq - Parse and manipulate JSON
        xan - Fast CSV processing, filtering, aggregation, and visualization
        pnpm - CLI tool for managing JavaScript packages.
        ts/tsx - Execute a TypeScript or JavaScript file, powered by Jiti. Does not support -e/--eval; always write code to a file first.
        tsc - TypeScript compiler for type-checking files. Do not pass individual file paths -- this bypasses tsconfig.json and skips the project's compiler settings."
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
