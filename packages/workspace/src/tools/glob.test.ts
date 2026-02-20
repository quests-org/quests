import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { FolderAttachment } from "../schemas/folder-attachment";
import { AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";

vi.mock(import("ulid"));
vi.mock(import("../lib/session-store-storage"));
vi.mock(import("../lib/get-current-date"));

const FIXTURES_PATH = path.join(
  import.meta.dirname,
  "../../fixtures/file-system",
);

const model = createMockAIGatewayModel();

function createFixturesAppConfig() {
  const mockConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"), {
    model,
  });
  return {
    ...mockConfig,
    appDir: AppDirSchema.parse(FIXTURES_PATH),
  };
}

// Sort files deterministically for testing (ripgrep returns mtime-sorted)
function sortFilesForTesting(files: string[]) {
  return [...files].sort((a, b) => a.localeCompare(b));
}

function stripFixturesPath(files: string[]) {
  return files.map((f) => f.replace(FIXTURES_PATH + "/", ""));
}

describe("Glob", () => {
  it("should find files matching a specific pattern", async () => {
    const result = await TOOLS.Glob.execute({
      agentName: "main",
      appConfig: createFixturesAppConfig(),
      input: {
        explanation: "Find ts files",
        pattern: "**/*.ts",
      },
      model,
      projectState: {},
      signal: AbortSignal.timeout(10_000),
      spawnAgent: vi.fn(),
    });

    expect(sortFilesForTesting(result._unsafeUnwrap().files))
      .toMatchInlineSnapshot(`
      [
        "./a-folder/built-in.ts",
        "./a-folder/external-module.ts",
      ]
    `);
  });

  it("should find files in a subdirectory when path is provided", async () => {
    const result = await TOOLS.Glob.execute({
      agentName: "main",
      appConfig: createFixturesAppConfig(),
      input: {
        explanation: "Find txt files in folder",
        path: "./folder",
        pattern: "*.txt",
      },
      model,
      projectState: {},
      signal: AbortSignal.timeout(10_000),
      spawnAgent: vi.fn(),
    });

    expect(sortFilesForTesting(result._unsafeUnwrap().files))
      .toMatchInlineSnapshot(`
      [
        "./other2.txt",
        "./test3.txt",
      ]
    `);
  });

  it("should return empty array when no files match", async () => {
    const result = await TOOLS.Glob.execute({
      agentName: "main",
      appConfig: createFixturesAppConfig(),
      input: {
        explanation: "Find nonexistent files",
        pattern: "*.nonexistent_extension_xyz",
      },
      model,
      projectState: {},
      signal: AbortSignal.timeout(10_000),
      spawnAgent: vi.fn(),
    });

    const output = result._unsafeUnwrap();
    expect(output.files).toEqual([]);
    expect(output.totalFiles).toBe(0);
    expect(output.truncated).toBe(false);
  });

  describe("retrieval agent", () => {
    const attachedFolders: Record<string, FolderAttachment.Type> = {
      "test-folder": {
        createdAt: Date.now(),
        id: FolderAttachment.IdSchema.parse("test-folder-id"),
        name: "Test Folder",
        path: AppDirSchema.parse(FIXTURES_PATH),
      },
    };

    it("should require a path parameter", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Find all txt files",
          pattern: "*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().error).toContain(
        "Must specify a path parameter",
      );
      expect(result._unsafeUnwrap().error).toContain("Test Folder");
      expect(result._unsafeUnwrap().files).toEqual([]);
    });

    it("should reject relative paths", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Find all txt files",
          path: "./nested",
          pattern: "*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().error).toContain("Path must be absolute");
      expect(result._unsafeUnwrap().files).toEqual([]);
    });

    it("should reject paths outside attached folders", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Find all txt files",
          path: "/some/random/path",
          pattern: "*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().error).toContain(
        "Path is not within any attached folder",
      );
      expect(result._unsafeUnwrap().error).toContain("Test Folder");
      expect(result._unsafeUnwrap().files).toEqual([]);
    });

    it("should find ts files in attached folder with absolute paths", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Find all ts files",
          path: FIXTURES_PATH,
          pattern: "**/*.ts",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      const rawFiles = sortFilesForTesting(result._unsafeUnwrap().files);
      expect(rawFiles.every((f) => path.isAbsolute(f))).toBe(true);
      expect(stripFixturesPath(rawFiles)).toEqual([
        "a-folder/built-in.ts",
        "a-folder/external-module.ts",
      ]);
    });

    it("should find files recursively in attached folder", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Find all txt files recursively",
          path: FIXTURES_PATH,
          pattern: "**/*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      const files = stripFixturesPath(
        sortFilesForTesting(result._unsafeUnwrap().files),
      );
      expect(files).toEqual([
        "empty-file.txt",
        "folder/other2.txt",
        "folder/test3.txt",
        "grep-test-2.txt",
        "grep-test.txt",
        "nested/another/file.txt",
        "nested/level1/test-deep.txt",
        "other.txt",
        "test1.txt",
        "test2.txt",
      ]);
    });

    it("should search within nested subdirectory of attached folder", async () => {
      const nestedPath = path.join(FIXTURES_PATH, "nested");
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: createFixturesAppConfig(),
        input: {
          explanation: "Find files in nested folder",
          path: nestedPath,
          pattern: "**/*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      const files = sortFilesForTesting(result._unsafeUnwrap().files).map((f) =>
        f.replace(nestedPath + "/", ""),
      );
      expect(files).toEqual(["another/file.txt", "level1/test-deep.txt"]);
    });
  });
});
