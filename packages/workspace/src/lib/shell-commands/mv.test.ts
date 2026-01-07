import mockFs from "mock-fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../../test/helpers/mock-app-config";
import { readDirSorted } from "../../test/helpers/read-dir-sorted";
import { mvCommand } from "./mv";

describe("mvCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  beforeEach(() => {
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [appConfig.folderName]: {
          "file.txt": "content",
          folder: {
            "nested.txt": "nested",
          },
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("moves a file", async () => {
    const result = await mvCommand(["file.txt", "renamed.txt"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "folder",
        "renamed.txt",
      ]
    `);
  });

  it("moves a file to a directory", async () => {
    const result = await mvCommand(["file.txt", "folder/moved.txt"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "folder",
      ]
    `);

    expect(await readDirSorted(path.join(appConfig.appDir, "folder")))
      .toMatchInlineSnapshot(`
      [
        "moved.txt",
        "nested.txt",
      ]
    `);
  });

  it("renames a directory", async () => {
    const result = await mvCommand(["folder", "renamed-folder"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "file.txt",
        "renamed-folder",
      ]
    `);

    expect(await readDirSorted(path.join(appConfig.appDir, "renamed-folder")))
      .toMatchInlineSnapshot(`
      [
        "nested.txt",
      ]
    `);
  });

  it("errors when no arguments provided", async () => {
    const result = await mvCommand([], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mv command requires exactly 2 arguments: mv <source> <destination>",
        "type": "execute-error",
      }
    `);
  });

  it("errors when only one argument provided", async () => {
    const result = await mvCommand(["file.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mv command requires exactly 2 arguments: mv <source> <destination>",
        "type": "execute-error",
      }
    `);
  });

  it("errors when source does not exist", async () => {
    const result = await mvCommand(["nonexistent.txt", "dest.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mv: cannot stat 'nonexistent.txt': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors when destination directory does not exist", async () => {
    const result = await mvCommand(
      ["file.txt", "nonexistent/file.txt"],
      appConfig,
    );

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mv: cannot move 'file.txt' to 'nonexistent/file.txt': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors with invalid source path", async () => {
    const result = await mvCommand(["/absolute/path", "dest.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mv: cannot stat '/absolute/path': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors with invalid destination path", async () => {
    const result = await mvCommand(["file.txt", "/absolute/path"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "mv: cannot move 'file.txt' to '/absolute/path': No such file or directory",
        "type": "execute-error",
      }
    `);
  });
});
