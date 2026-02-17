import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { FolderAttachment } from "../schemas/folder-attachment";
import { AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";

const model = createMockAIGatewayModel();

const fixturesPath = path.join(
  import.meta.dirname,
  "../../fixtures/file-system",
);

const appConfig = {
  ...createMockAppConfig(ProjectSubdomainSchema.parse("test"), { model }),
  appDir: AppDirSchema.parse(fixturesPath),
};

const attachedFolders: Record<string, FolderAttachment.Type> = {
  "test-folder": {
    createdAt: Date.now(),
    id: FolderAttachment.IdSchema.parse("test-folder-id"),
    name: "Test Folder",
    path: AppDirSchema.parse(fixturesPath),
  },
};

/* eslint-disable unicorn/no-await-expression-member */
describe("ReadFile", () => {
  describe("main agent", () => {
    const baseInput = {
      agentName: "main" as const,
      appConfig,
      model,
      projectState: {},
      signal: AbortSignal.timeout(10_000),
      spawnAgent: vi.fn(),
    };

    it("should read a file by relative path", async () => {
      const value = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: { explanation: "read", filePath: "./grep-test.txt" },
        })
      )._unsafeUnwrap();

      expect(value.state).toBe("exists");
      if (value.state === "exists") {
        expect(value.content).toContain("async function testGrep");
        expect(value.filePath).toBe("./grep-test.txt");
      }
    });

    it("should return does-not-exist with suggestions for a similarly-named file", async () => {
      const value = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: { explanation: "read", filePath: "./grep-test.ts" },
        })
      )._unsafeUnwrap();

      expect(value.state).toBe("does-not-exist");
      if (value.state === "does-not-exist") {
        expect(value.suggestions).toContain("grep-test.txt");
      }
    });

    it("should respect limit and offset", async () => {
      const value = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: {
            explanation: "read",
            filePath: "./grep-test.txt",
            limit: 3,
            offset: 3,
          },
        })
      )._unsafeUnwrap();

      expect(value.state).toBe("exists");
      if (value.state === "exists") {
        expect(value.displayedLines).toBe(3);
        expect(value.offset).toBe(3);
        expect(value.content).toContain("async functions");
      }
    });
  });

  describe("retrieval agent", () => {
    const baseInput = {
      agentName: "retrieval" as const,
      appConfig,
      model,
      projectState: { attachedFolders },
      signal: AbortSignal.timeout(10_000),
      spawnAgent: vi.fn(),
    };

    it("should reject relative paths", async () => {
      const error = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: { explanation: "read", filePath: "./grep-test.txt" },
        })
      )._unsafeUnwrapErr();

      expect(error.message).toContain("Path must be absolute");
    });

    it("should reject paths outside attached folders", async () => {
      const error = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: { explanation: "read", filePath: "/some/random/file.txt" },
        })
      )._unsafeUnwrapErr();

      expect(error.message).toContain("Path is not within any attached folder");
      expect(error.message).toContain("Test Folder");
    });

    it("should read a file within an attached folder", async () => {
      const value = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: {
            explanation: "read",
            filePath: path.join(fixturesPath, "grep-test.txt"),
          },
        })
      )._unsafeUnwrap();

      expect(value.state).toBe("exists");
      if (value.state === "exists") {
        expect(value.content).toContain("async function testGrep");
        expect(value.filePath).toBe(path.join(fixturesPath, "grep-test.txt"));
      }
    });

    it("should read a file in a nested subdirectory of an attached folder", async () => {
      const value = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: {
            explanation: "read",
            filePath: path.join(fixturesPath, "nested/level1/test-deep.txt"),
          },
        })
      )._unsafeUnwrap();

      expect(value.state).toBe("exists");
    });

    it("should return does-not-exist with suggestions for a similarly-named file", async () => {
      const value = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: {
            explanation: "read",
            filePath: path.join(fixturesPath, "grep-test.ts"),
          },
        })
      )._unsafeUnwrap();

      expect(value.state).toBe("does-not-exist");
      if (value.state === "does-not-exist") {
        expect(value.suggestions).toContain(
          path.join(fixturesPath, "grep-test.txt"),
        );
      }
    });
  });
});

/* eslint-enable unicorn/no-await-expression-member */
