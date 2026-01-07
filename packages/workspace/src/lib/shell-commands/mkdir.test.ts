import mockFs from "mock-fs";
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../../test/helpers/mock-app-config";
import { readDirSorted } from "../../test/helpers/read-dir-sorted";
import { mkdirCommand } from "./mkdir";

describe("mkdirCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  beforeEach(() => {
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [appConfig.folderName]: {
          existing: {},
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("creates a directory", async () => {
    const result = await mkdirCommand(["newdir"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "existing",
        "newdir",
      ]
    `);
  });

  it("creates multiple directories", async () => {
    const result = await mkdirCommand(["dir1", "dir2"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "dir1",
        "dir2",
        "existing",
      ]
    `);
  });

  it("creates nested directories with -p flag", async () => {
    const result = await mkdirCommand(["-p", "nested/deep/dir"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "existing",
        "nested",
      ]
    `);

    const nestedPath = path.join(appConfig.appDir, "nested/deep/dir");
    const stats = await fs.stat(nestedPath);
    expect(stats.isDirectory()).toBe(true);
  });

  it("errors when no arguments provided", async () => {
    const result = await mkdirCommand([], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mkdir command requires at least 1 argument: mkdir [-p] <directory> [<directory> ...]",
        "type": "execute-error",
      }
    `);
  });

  it("errors when -p flag provided without path", async () => {
    const result = await mkdirCommand(["-p"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mkdir -p command requires at least 1 path argument: mkdir -p <directory> [<directory> ...]",
        "type": "execute-error",
      }
    `);
  });

  it("errors with empty path", async () => {
    const result = await mkdirCommand([""], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mkdir command requires valid path arguments",
        "type": "execute-error",
      }
    `);
  });

  it("errors with invalid path", async () => {
    const result = await mkdirCommand(["/absolute/path"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mkdir command failed for '/absolute/path': ENOENT, no such file or directory '/tmp/workspace/projects/test/absolute/path'",
        "type": "execute-error",
      }
    `);
  });

  it("creates multiple nested directories with -p flag", async () => {
    const result = await mkdirCommand(
      ["-p", "nested1/deep1", "nested2/deep2"],
      appConfig,
    );

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "existing",
        "nested1",
        "nested2",
      ]
    `);
  });

  it("errors when glob pattern is used", async () => {
    const result = await mkdirCommand(["test*"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mkdir: glob patterns are not supported. Found glob pattern in 'test*'. Please specify exact file or directory names.",
        "type": "execute-error",
      }
    `);
  });
});
