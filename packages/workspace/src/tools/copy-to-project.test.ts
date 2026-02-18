import mockFs from "mock-fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FolderAttachment } from "../schemas/folder-attachment";
import { AppDirSchema, RelativePathSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";
import { CopyToProject } from "./copy-to-project";

vi.mock(import("ulid"));
vi.mock(import("../lib/session-store-storage"));
vi.mock(import("../lib/get-current-date"));

const model = createMockAIGatewayModel();
const projectAppConfig = createMockAppConfig(
  ProjectSubdomainSchema.parse("test"),
  { model },
);

const attachedFolderPath = path.join(
  MOCK_WORKSPACE_DIRS.projects,
  "attached-test-folder",
);

const attachedFolders: Record<string, FolderAttachment.Type> = {
  "test-folder": {
    createdAt: Date.now(),
    id: FolderAttachment.IdSchema.parse("test-folder-id"),
    name: "Test Folder",
    path: AppDirSchema.parse(attachedFolderPath),
  },
};

const baseExecuteArgs = {
  agentName: "retrieval" as const,
  appConfig: projectAppConfig,
  model,
  projectState: { attachedFolders },
  signal: AbortSignal.timeout(10_000),
  spawnAgent: vi.fn(),
};

describe("CopyToProject", () => {
  describe("toModelOutput", () => {
    it("should return error when no files were copied and no errors", () => {
      const result = CopyToProject.toModelOutput({
        input: { path: attachedFolderPath, pattern: "*.ts" },
        output: {
          errors: [],
          files: [],
          truncatedCount: 0,
          truncationReason: null,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "error-text",
          "value": "No files were copied",
        }
      `);
    });

    it("should return error text when only errors occurred", () => {
      const result = CopyToProject.toModelOutput({
        input: { path: attachedFolderPath, pattern: "*.ts" },
        output: {
          errors: [{ message: "File not found", sourcePath: "/some/file.ts" }],
          files: [],
          truncatedCount: 0,
          truncationReason: null,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "error-text",
          "value": "Failed to copy any files:
          - /some/file.ts: File not found",
        }
      `);
    });

    it("should format a single copied file", () => {
      const result = CopyToProject.toModelOutput({
        input: { path: attachedFolderPath, pattern: "*.txt" },
        output: {
          errors: [],
          files: [
            {
              destinationPath: RelativePathSchema.parse(
                "./agent-retrieved/file.txt",
              ),
              size: 1024,
              sourcePath: "/source/file.txt",
            },
          ],
          truncatedCount: 0,
          truncationReason: null,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Copied to ./agent-retrieved/file.txt 1KB. Parent agent can now access this file.",
        }
      `);
    });

    it("should format multiple copied files with total size", () => {
      const result = CopyToProject.toModelOutput({
        input: { path: attachedFolderPath, pattern: "*.txt" },
        output: {
          errors: [],
          files: [
            {
              destinationPath: RelativePathSchema.parse(
                "./agent-retrieved/file1.txt",
              ),
              size: 1024,
              sourcePath: "/source/file1.txt",
            },
            {
              destinationPath: RelativePathSchema.parse(
                "./agent-retrieved/file2.txt",
              ),
              size: 2048,
              sourcePath: "/source/file2.txt",
            },
          ],
          truncatedCount: 0,
          truncationReason: null,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Copied 2 files (3KB total). Parent agent can now access these files:
          - ./agent-retrieved/file1.txt 1KB
          - ./agent-retrieved/file2.txt 2KB",
        }
      `);
    });

    it("should report truncation when file count limit was hit", () => {
      const result = CopyToProject.toModelOutput({
        input: { path: attachedFolderPath, pattern: "**/*" },
        output: {
          errors: [],
          files: [
            {
              destinationPath: RelativePathSchema.parse(
                "./agent-retrieved/file1.txt",
              ),
              size: 1024,
              sourcePath: "/source/file1.txt",
            },
          ],
          truncatedCount: 3,
          truncationReason: "file_count_limit",
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Copied 1 files (1KB total). Parent agent can now access these files:
          - ./agent-retrieved/file1.txt 1KB

        Truncated file count limit reached (maxFiles): 3 file(s) not copied. Use a more specific pattern or increase the limit to copy the remaining files.",
        }
      `);
    });

    it("should report truncation when total size limit was hit", () => {
      const result = CopyToProject.toModelOutput({
        input: { path: attachedFolderPath, pattern: "**/*" },
        output: {
          errors: [],
          files: [
            {
              destinationPath: RelativePathSchema.parse(
                "./agent-retrieved/file1.txt",
              ),
              size: 1024,
              sourcePath: "/source/file1.txt",
            },
          ],
          truncatedCount: 3,
          truncationReason: "total_size_limit",
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Copied 1 files (1KB total). Parent agent can now access these files:
          - ./agent-retrieved/file1.txt 1KB

        Truncated total size limit reached (maxTotalSizeBytes): 3 file(s) not copied. Use a more specific pattern or increase the limit to copy the remaining files.",
        }
      `);
    });

    it("should include errors in output when some files succeeded and some failed", () => {
      const result = CopyToProject.toModelOutput({
        input: { path: attachedFolderPath, pattern: "*.txt" },
        output: {
          errors: [
            { message: "File too large", sourcePath: "/source/big.txt" },
          ],
          files: [
            {
              destinationPath: RelativePathSchema.parse(
                "./agent-retrieved/small.txt",
              ),
              size: 512,
              sourcePath: "/source/small.txt",
            },
          ],
          truncatedCount: 0,
          truncationReason: null,
        },
        toolCallId: "123",
      });
      expect(result).toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Copied 1 files (512B total). Parent agent can now access these files:
          - ./agent-retrieved/small.txt 512B
        Failed to copy 1 files:
          - /source/big.txt: File too large",
        }
      `);
    });
  });

  describe("execute", () => {
    beforeEach(() => {
      mockFs({
        [MOCK_WORKSPACE_DIRS.projects]: {
          "attached-test-folder": {
            "file-a.txt": "content a",
            "file-b.txt": "content b",
            nested: {
              "deep.txt": "deep content",
            },
            "script.ts": "const x = 1;",
          },
          [projectAppConfig.folderName]: {},
        },
      });
    });

    afterEach(() => {
      mockFs.restore();
    });

    it("should return error when not the retrieval agent", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        agentName: "main",
        input: { path: attachedFolderPath, pattern: "*.txt" },
      });

      expect(result._unsafeUnwrapErr().message).toContain(
        "only available to the retrieval agent",
      );
    });

    it("should return error when no attached folders", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: { path: attachedFolderPath, pattern: "*.txt" },
        projectState: {},
      });

      expect(result._unsafeUnwrapErr().message).toContain(
        "No attached folders available",
      );
    });

    it("should return error when path is not within attached folders", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: { path: "/some/random/path", pattern: "*.txt" },
      });

      expect(result._unsafeUnwrapErr().message).toContain(
        "Path is not within any attached folder",
      );
    });

    it("should return error when no files match the pattern", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: {
          path: attachedFolderPath,
          pattern: "*.nonexistent-extension-xyz",
        },
      });

      expect(result._unsafeUnwrapErr().message).toContain("No files found");
    });

    it("should copy a single matching file to agent-retrieved folder", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: { path: attachedFolderPath, pattern: "file-a.txt" },
      });
      const output = result._unsafeUnwrap();

      expect(output.errors).toEqual([]);
      expect(output.files).toHaveLength(1);
      expect(output.files[0]?.destinationPath).toContain("agent-retrieved");
      expect(output.files[0]?.destinationPath).toContain("file-a.txt");
    });

    it("should copy multiple files matching a glob pattern", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: { path: attachedFolderPath, pattern: "*.txt" },
      });
      const output = result._unsafeUnwrap();

      expect(output.errors).toEqual([]);
      expect(output.files).toHaveLength(2);
      expect(
        output.files.every((f) =>
          f.destinationPath.includes("agent-retrieved"),
        ),
      ).toBe(true);
    });

    it("should rename conflicting files with a counter suffix", async () => {
      const firstResult = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: { path: attachedFolderPath, pattern: "file-a.txt" },
      });
      const first = firstResult._unsafeUnwrap();

      const secondResult = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: { path: attachedFolderPath, pattern: "file-a.txt" },
      });
      const second = secondResult._unsafeUnwrap();

      expect(first.files[0]?.destinationPath).not.toEqual(
        second.files[0]?.destinationPath,
      );
      expect(second.files[0]?.destinationPath).toContain("file-a-1.txt");
    });

    it("should reject maxFileSizeBytes above the 1GB hard cap", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: {
          maxFileSizeBytes: 1024 * 1024 * 1024 + 1,
          path: attachedFolderPath,
          pattern: "*.txt",
        },
      });

      expect(result._unsafeUnwrapErr().message).toContain(
        "exceeds the hard cap of 1GB per file",
      );
    });

    it("should reject maxTotalSizeBytes above the 10GB hard cap", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: {
          maxTotalSizeBytes: 1024 * 1024 * 1024 * 10 + 1,
          path: attachedFolderPath,
          pattern: "*.txt",
        },
      });

      expect(result._unsafeUnwrapErr().message).toContain(
        "exceeds the hard cap of 10GB per call",
      );
    });

    it("should skip a file that exceeds a custom maxFileSizeBytes override", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: {
          maxFileSizeBytes: 1, // 1 byte — everything will be too large
          path: attachedFolderPath,
          pattern: "file-a.txt",
        },
      });
      const output = result._unsafeUnwrap();

      expect(output.files).toHaveLength(0);
      expect(output.errors).toHaveLength(1);
      expect(output.errors[0]?.message).toContain("File too large");
      expect(output.errors[0]?.message).toContain("max per-file size is 1B");
    });

    it("should truncate when files exceed a custom maxTotalSizeBytes override", async () => {
      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: {
          maxTotalSizeBytes: 1, // 1 byte — only first file will be within budget
          path: attachedFolderPath,
          pattern: "*.txt",
        },
      });
      const output = result._unsafeUnwrap();

      expect(output.truncationReason).toBe("total_size_limit");
      expect(output.truncatedCount).toBeGreaterThan(0);
    });

    it("should copy files from a nested subdirectory of the attached folder", async () => {
      const nestedPath = path.join(attachedFolderPath, "nested");
      const baseFolder = attachedFolders["test-folder"];
      if (!baseFolder) {
        throw new Error("Missing test-folder fixture");
      }
      const nestedAttachedFolders: Record<string, FolderAttachment.Type> = {
        "test-folder": {
          ...baseFolder,
          path: AppDirSchema.parse(nestedPath),
        },
      };

      const result = await TOOLS.CopyToProject.execute({
        ...baseExecuteArgs,
        input: { path: nestedPath, pattern: "*.txt" },
        projectState: { attachedFolders: nestedAttachedFolders },
      });
      const output = result._unsafeUnwrap();

      expect(output.files).toHaveLength(1);
      expect(output.files[0]?.destinationPath).toContain("deep.txt");
    });
  });
});
