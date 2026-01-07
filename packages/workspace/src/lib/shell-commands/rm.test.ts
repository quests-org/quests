import mockFs from "mock-fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../../test/helpers/mock-app-config";
import { readDirSorted } from "../../test/helpers/read-dir-sorted";
import { rmCommand } from "./rm";

describe("rmCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  beforeEach(() => {
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [appConfig.folderName]: {
          "file1.txt": "content1",
          "file2.txt": "content2",
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

  it("removes a file", async () => {
    const result = await rmCommand(["file.txt"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "file1.txt",
        "file2.txt",
        "folder",
      ]
    `);
  });

  it("removes multiple files", async () => {
    const result = await rmCommand(["file1.txt", "file2.txt"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "file.txt",
        "folder",
      ]
    `);
  });

  it("removes directory with -r flag", async () => {
    const result = await rmCommand(["-r", "folder"], appConfig);

    expect(result.isOk()).toBe(true);

    expect(await readDirSorted(appConfig.appDir)).toMatchInlineSnapshot(`
      [
        "file.txt",
        "file1.txt",
        "file2.txt",
      ]
    `);
  });

  it("errors when no arguments provided", async () => {
    const result = await rmCommand([], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "rm command requires at least 1 argument: rm [-r] <file|directory> [<file|directory> ...]",
        "type": "execute-error",
      }
    `);
  });

  it("errors when -r flag provided without path", async () => {
    const result = await rmCommand(["-r"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "rm -r command requires at least 1 path argument: rm -r <directory> [<directory> ...]",
        "type": "execute-error",
      }
    `);
  });

  it("errors when file does not exist", async () => {
    const result = await rmCommand(["non-existent.txt"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "rm: cannot remove 'non-existent.txt': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors when trying to remove directory without -r flag", async () => {
    const result = await rmCommand(["folder"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "rm: cannot remove 'folder': Is a directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors with invalid path", async () => {
    const result = await rmCommand(["/absolute/path"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "rm: cannot remove '/absolute/path': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors with empty path", async () => {
    const result = await rmCommand([""], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "rm command requires valid path arguments",
        "type": "execute-error",
      }
    `);
  });
});
