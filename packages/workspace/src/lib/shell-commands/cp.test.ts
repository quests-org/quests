import mockFs from "mock-fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../../test/helpers/mock-app-config";
import { readDirSorted } from "../../test/helpers/read-dir-sorted";
import { cpCommand } from "./cp";

describe("cpCommand", () => {
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

  it("copies a file", async () => {
    const result = await cpCommand(["file.txt", "copy.txt"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "copy.txt",
        "file.txt",
        "folder",
      ]
    `);
  });

  it.skip("copies a directory with -r flag", async () => {
    // mock-fs doesn't support fs.cp properly
    const result = await cpCommand(["-r", "folder", "folder-copy"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot();
  });

  it("errors when no arguments provided", async () => {
    const result = await cpCommand([], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "cp command requires at least 2 arguments: cp [-r] <source> <destination>",
        "type": "execute-error",
      }
    `);
  });

  it("errors when only one argument provided", async () => {
    const result = await cpCommand(["file.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "cp command requires exactly 2 arguments: cp <source> <destination>",
        "type": "execute-error",
      }
    `);
  });

  it("errors when source does not exist", async () => {
    const result = await cpCommand(["nonexistent.txt", "dest.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "cp: cannot stat 'nonexistent.txt': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors when copying directory without -r flag", async () => {
    const result = await cpCommand(["folder", "folder-copy"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "cp: -r not specified; omitting directory 'folder'",
        "type": "execute-error",
      }
    `);
  });

  it("errors with invalid source path", async () => {
    const result = await cpCommand(["/absolute/path", "dest.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "cp: cannot stat '/absolute/path': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors with invalid destination path", async () => {
    const result = await cpCommand(["file.txt", "/absolute/path"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "cp command failed: ENOENT, no such file or directory '/tmp/workspace/projects/test/absolute/path'",
        "type": "execute-error",
      }
    `);
  });

  it("errors when -r flag provided with wrong number of args", async () => {
    const result = await cpCommand(["-r", "file.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "cp -r command requires exactly 2 path arguments: cp -r <source> <destination>",
        "type": "execute-error",
      }
    `);
  });
});
