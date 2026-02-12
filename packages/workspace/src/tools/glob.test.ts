import mockFs from "mock-fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FolderAttachment } from "../schemas/folder-attachment";
import { AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";

vi.mock(import("ulid"));
vi.mock(import("../lib/session-store-storage"));
vi.mock(import("../lib/get-current-date"));

describe("Glob", () => {
  const model = createMockAIGatewayModel();
  const projectAppConfig = createMockAppConfig(
    ProjectSubdomainSchema.parse("test"),
    { model },
  );

  beforeEach(() => {
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [projectAppConfig.folderName]: {
          ".gitignore": "node_modules",
          folder: {
            "other2.txt": "other2",
            "test3.txt": "test3",
          },
          "other.txt": "other",
          "test1.txt": "test1",
          "test2.txt": "test2",
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it.each([
    {
      expectedFiles: ["test1.txt", "test2.txt"],
      name: "with basic pattern",
      pattern: "test*.txt",
    },
    {
      expectedFiles: ["folder/test3.txt", "test1.txt", "test2.txt"],
      name: "with recursive pattern",
      pattern: "**/test*.txt",
    },
  ])(
    "should find files matching a glob pattern $name",
    async ({ expectedFiles, pattern }) => {
      const result = await TOOLS.Glob.execute({
        agentName: "main",
        appConfig: projectAppConfig,
        input: {
          explanation: "I want to find all test files",
          pattern,
        },
        model,
        projectState: {},
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().files).toEqual(expectedFiles);
    },
  );

  describe("retrieval agent", () => {
    const attachedFolderPath = path.join(
      MOCK_WORKSPACE_DIRS.projects,
      "attached-test-folder",
    );

    const attachedFolders: Record<string, FolderAttachment.Type> = {
      "attached-folder": {
        createdAt: Date.now(),
        id: FolderAttachment.IdSchema.parse("attached-folder-id"),
        name: "Attached Folder",
        path: AppDirSchema.parse(attachedFolderPath),
      },
    };

    beforeEach(() => {
      mockFs({
        [MOCK_WORKSPACE_DIRS.projects]: {
          "attached-test-folder": {
            "doc1.txt": "doc1",
            "doc2.md": "doc2",
            nested: {
              "deep-doc.txt": "deep doc",
            },
          },
          [projectAppConfig.folderName]: {
            ".gitignore": "node_modules",
            "test1.txt": "test1",
          },
        },
      });
    });

    it("should require a path parameter", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: projectAppConfig,
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
      expect(result._unsafeUnwrap().error).toContain("Attached Folder");
      expect(result._unsafeUnwrap().files).toEqual([]);
    });

    it("should reject relative paths", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: projectAppConfig,
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
        appConfig: projectAppConfig,
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
      expect(result._unsafeUnwrap().error).toContain("Attached Folder");
      expect(result._unsafeUnwrap().files).toEqual([]);
    });

    it("should reject project folder path (only attached folders allowed)", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: projectAppConfig,
        input: {
          explanation: "Find all txt files",
          path: projectAppConfig.appDir,
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
      expect(result._unsafeUnwrap().files).toEqual([]);
    });

    it("should find files in attached folder with absolute paths", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: projectAppConfig,
        input: {
          explanation: "Find all txt files",
          path: attachedFolderPath,
          pattern: "*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().files).toEqual([
        path.join(attachedFolderPath, "doc1.txt"),
      ]);
    });

    it("should find files recursively in attached folder", async () => {
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: projectAppConfig,
        input: {
          explanation: "Find all txt files recursively",
          path: attachedFolderPath,
          pattern: "**/*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().files).toEqual([
        path.join(attachedFolderPath, "doc1.txt"),
        path.join(attachedFolderPath, "nested/deep-doc.txt"),
      ]);
    });

    it("should search within nested subdirectory of attached folder", async () => {
      const nestedPath = path.join(attachedFolderPath, "nested");
      const result = await TOOLS.Glob.execute({
        agentName: "retrieval",
        appConfig: projectAppConfig,
        input: {
          explanation: "Find files in nested folder",
          path: nestedPath,
          pattern: "*.txt",
        },
        model,
        projectState: { attachedFolders },
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().files).toEqual([
        path.join(nestedPath, "deep-doc.txt"),
      ]);
    });
  });
});
