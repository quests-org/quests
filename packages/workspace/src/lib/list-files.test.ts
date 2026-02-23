import path from "node:path";
import { describe, expect, it } from "vitest";

import { type AbsolutePath, AbsolutePathSchema } from "../schemas/paths";
import { listFiles } from "./list-files";

function getFixturesDir(): AbsolutePath {
  return AbsolutePathSchema.parse(
    path.join(import.meta.dirname, "../../fixtures/file-system"),
  );
}

describe("listFiles", () => {
  it("lists immediate children in fixtures directory", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir);

    expect(result.files).toMatchInlineSnapshot(`
      [
        "a-folder",
        "dot-files-only",
        "empty-file.txt",
        "folder",
        "grep-test-2.txt",
        "grep-test.txt",
        "ignored-2.ignored",
        "ignored-folder",
        "json-file.json",
        "nested",
        "other.txt",
        "test1.txt",
        "test2.txt",
      ]
    `);
  });

  it("excludes hidden files by default", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir);

    expect(result.files.some((file) => file.includes("."))).toBe(true);
    expect(result.files.some((file) => file.startsWith("."))).toBe(false);
  });

  it("includes hidden files when hidden option is true", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir, { hidden: true });

    expect(result.files).toContain(".gitignore");
    expect(result.files).toContain("dot-files-only");
  });

  it("lists files in a subdirectory", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir, { searchPath: "nested" });

    expect(result.files).toMatchInlineSnapshot(`
      [
        "another",
        "level1",
      ]
    `);
  });

  it("lists files in a deeply nested subdirectory", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir, {
      searchPath: "nested/another",
    });

    expect(result.files).toMatchInlineSnapshot(`
      [
        "file.txt",
      ]
    `);
  });

  it("returns empty array for non-existent directory", async () => {
    const nonExistent = AbsolutePathSchema.parse(
      path.join(getFixturesDir(), "does-not-exist"),
    );

    const result = await listFiles(nonExistent);

    expect(result.files).toEqual([]);
  });

  it("returns sorted file list", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir, { searchPath: "a-folder" });

    expect(result.files).toMatchInlineSnapshot(`
      [
        "built-in.ts",
        "external-module.ts",
      ]
    `);
  });

  it("truncates results when limit is exceeded", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir, { limit: 3 });

    expect(result.truncated).toBe(true);
    expect(result.files).toHaveLength(3);
  });

  it("does not truncate when results are within limit", async () => {
    const fixturesDir = getFixturesDir();
    const result = await listFiles(fixturesDir, { limit: 1000 });

    expect(result.truncated).toBe(false);
  });
});
