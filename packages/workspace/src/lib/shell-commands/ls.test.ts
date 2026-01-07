import mockFs from "mock-fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../../test/helpers/mock-app-config";
import { lsCommand } from "./ls";

describe("lsCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  beforeEach(() => {
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [appConfig.folderName]: {
          ".hidden": "hidden",
          "file1.txt": "content1",
          "file2.txt": "content2",
          folder: {
            "nested.txt": "nested",
          },
          folder2: {
            "another.txt": "another",
            "file.txt": "file",
          },
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it("lists files in current directory", async () => {
    const result = await lsCommand([], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "command": "ls",
        "exitCode": 0,
        "stderr": "",
        "stdout": "file1.txt
      file2.txt
      folder
      folder2",
      }
    `);
  });

  it("lists files in specified directory", async () => {
    const result = await lsCommand(["folder"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "command": "ls folder",
        "exitCode": 0,
        "stderr": "",
        "stdout": "nested.txt",
      }
    `);
  });

  it("lists hidden files with -a flag", async () => {
    const result = await lsCommand(["-a"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "command": "ls -a",
        "exitCode": 0,
        "stderr": "",
        "stdout": ".hidden
      file1.txt
      file2.txt
      folder
      folder2",
      }
    `);
  });

  it("lists hidden files in specified directory with -a flag", async () => {
    const result = await lsCommand(["-a", "folder"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "command": "ls -a folder",
        "exitCode": 0,
        "stderr": "",
        "stdout": "nested.txt",
      }
    `);
  });

  it("lists a single file", async () => {
    const result = await lsCommand(["file1.txt"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "command": "ls file1.txt",
        "exitCode": 0,
        "stderr": "",
        "stdout": "file1.txt",
      }
    `);
  });

  it("lists multiple directories", async () => {
    const result = await lsCommand(["folder", "folder2"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "command": "ls folder folder2",
        "exitCode": 0,
        "stderr": "",
        "stdout": "folder:
      nested.txt

      folder2:
      another.txt
      file.txt",
      }
    `);
  });

  it("warns about unknown flags", async () => {
    const result = await lsCommand(["-l"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "command": "ls -l",
        "exitCode": 0,
        "stderr": "ls: unknown flag '-l' ignored (supported flags: -a)",
        "stdout": "file1.txt
      file2.txt
      folder
      folder2",
      }
    `);
  });

  it("errors when path does not exist", async () => {
    const result = await lsCommand(["nonexistent"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ls: cannot access 'nonexistent': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors with invalid path", async () => {
    const result = await lsCommand(["/absolute/path"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ls: cannot access '/absolute/path': No such file or directory",
        "type": "execute-error",
      }
    `);
  });

  it("errors when glob pattern is used", async () => {
    const result = await lsCommand(["test*"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ls: glob patterns are not supported. Found glob pattern in 'test*'. Please specify exact file or directory names.",
        "type": "execute-error",
      }
    `);
  });
});
