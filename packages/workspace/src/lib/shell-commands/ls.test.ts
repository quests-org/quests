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

  it.each([
    {
      args: [],
      expected: "file1.txt\nfile2.txt\nfolder\nfolder2",
      testName: "lists files in current directory",
    },
    {
      args: ["folder"],
      expected: "nested.txt",
      testName: "lists files in specified directory",
    },
    {
      args: ["-a"],
      expected: ".hidden\nfile1.txt\nfile2.txt\nfolder\nfolder2",
      testName: "lists hidden files with -a flag",
    },
    {
      args: ["-a", "folder"],
      expected: "nested.txt",
      testName: "lists hidden files in specified directory with -a flag",
    },
    {
      args: ["file1.txt"],
      expected: "file1.txt",
      testName: "lists a single file",
    },
  ])("$testName", async ({ args, expected }) => {
    const result = await lsCommand(args, appConfig);
    const output = result._unsafeUnwrap();
    expect(output.combined).toBe(expected);
    expect(output.exitCode).toBe(0);
  });

  it("lists multiple directories", async () => {
    const result = await lsCommand(["folder", "folder2"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "combined": "folder:
      nested.txt

      folder2:
      another.txt
      file.txt",
        "command": "ls folder folder2",
        "exitCode": 0,
      }
    `);
  });

  it.each([
    ["-l"],
    ["-A"],
    ["-l", "-h", "-t", "-r"],
    ["-F", "-G", "--color"],
    ["-t", "-r", "-S"],
  ])("silently ignores cosmetic flags: %s", async (...args) => {
    const result = await lsCommand(args, appConfig);
    const output = result._unsafeUnwrap();
    expect(output.combined).toBe("file1.txt\nfile2.txt\nfolder\nfolder2");
    expect(output.exitCode).toBe(0);
  });

  it("warns about truly unknown flags", async () => {
    const result = await lsCommand(["-Z"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "combined": "ls: unknown flag '-Z' ignored (supported flags: -a)
      file1.txt
      file2.txt
      folder
      folder2",
        "command": "ls -Z",
        "exitCode": 0,
      }
    `);
  });

  it.each([
    {
      args: ["-a", "-l", "-h", "-t"],
      expected: ".hidden\nfile1.txt\nfile2.txt\nfolder\nfolder2",
      testName: "combines -a with ignored flags",
    },
    {
      args: ["-al"],
      expected: ".hidden\nfile1.txt\nfile2.txt\nfolder\nfolder2",
      testName: "handles combined flags like -al",
    },
    {
      args: ["-lah"],
      expected: ".hidden\nfile1.txt\nfile2.txt\nfolder\nfolder2",
      testName: "handles combined flags like -lah",
    },
    {
      args: ["-la", "folder"],
      expected: "nested.txt",
      testName: "handles combined flags with path",
    },
    {
      // cspell:ignore lhtr
      args: ["-lhtr"],
      expected: "file1.txt\nfile2.txt\nfolder\nfolder2",
      testName: "handles combined ignored flags without -a",
    },
  ])("$testName", async ({ args, expected }) => {
    const result = await lsCommand(args, appConfig);
    const output = result._unsafeUnwrap();
    expect(output.combined).toBe(expected);
    expect(output.exitCode).toBe(0);
  });

  it("warns only about truly unknown flags in combined format", async () => {
    const result = await lsCommand(["-alZ"], appConfig);

    expect(result._unsafeUnwrap()).toMatchInlineSnapshot(`
      {
        "combined": "ls: unknown flag '-Z' ignored (supported flags: -a)
      .hidden
      file1.txt
      file2.txt
      folder
      folder2",
        "command": "ls -alZ",
        "exitCode": 0,
      }
    `);
  });

  it.each([
    {
      args: ["nonexistent"],
      expectedMessage:
        "ls: cannot access 'nonexistent': No such file or directory",
      testName: "errors when path does not exist",
    },
    {
      args: ["/absolute/path"],
      expectedMessage:
        "ls: cannot access '/absolute/path': No such file or directory",
      testName: "errors with invalid path",
    },
  ])("$testName", async ({ args, expectedMessage }) => {
    const result = await lsCommand(args, appConfig);
    const error = result._unsafeUnwrapErr();
    expect(error.message).toBe(expectedMessage);
    expect(error.type).toBe("execute-error");
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

  it("truncates output and appends note when directory has more entries than LS_LIMIT", async () => {
    const manyFiles: Record<string, string> = {};
    for (let i = 0; i < 205; i++) {
      manyFiles[`file${String(i).padStart(3, "0")}.txt`] = "content";
    }
    mockFs.restore();
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [appConfig.folderName]: manyFiles,
      },
    });

    const result = await lsCommand([], appConfig);
    const output = result._unsafeUnwrap();

    expect(output.exitCode).toBe(0);
    expect(output.combined).toContain(
      "[output truncated, showing first 200 entries]",
    );
    expect(output.combined.split("\n")).toHaveLength(201);
  });
});
