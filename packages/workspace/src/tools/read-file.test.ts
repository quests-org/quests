import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { FolderAttachment } from "../schemas/folder-attachment";
import { AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";
import { ReadFile } from "./read-file";

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

    it("should list files when given a directory path", async () => {
      const value = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: { explanation: "read", filePath: "./a-folder" },
        })
      )._unsafeUnwrap();

      expect(value.state).toBe("exists");
      if (value.state === "exists") {
        expect(value.content).toMatchInlineSnapshot(`
          "built-in.ts
          external-module.ts"
        `);
      }
    });

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

    it("should return a specialized error when an absolute path matches an attached folder", async () => {
      const error = (
        await TOOLS.ReadFile.execute({
          ...baseInput,
          input: {
            explanation: "read",
            filePath: path.join(fixturesPath, "grep-test.txt"),
          },
          projectState: { attachedFolders },
        })
      )._unsafeUnwrapErr();

      expect(error.message).toContain("retrieval");
      expect(error.message).toContain("task");
      expect(error.message).toContain("Test Folder");
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

describe("toModelOutput", () => {
  it("should return error text when file does not exist with suggestions", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./missing.ts" },
      output: {
        filePath: "./missing.ts",
        state: "does-not-exist",
        suggestions: ["./missing.txt", "./missing.tsx"],
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "error-text",
        "value": "File ./missing.ts does not exist

      Did you mean one of these?
      ./missing.txt
      ./missing.tsx",
      }
    `);
  });

  it("should return error text when file does not exist with no suggestions", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./missing.ts" },
      output: {
        filePath: "./missing.ts",
        state: "does-not-exist",
        suggestions: [],
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "error-text",
        "value": "File ./missing.ts does not exist",
      }
    `);
  });

  it("should return error text for unsupported image format", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./photo.bmp" },
      output: {
        filePath: "./photo.bmp",
        mimeType: "image/bmp",
        reason: "unsupported-image-format",
        state: "unsupported-format",
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "error-text",
        "value": "Unsupported image format: ./photo.bmp (image/bmp). Input should be 'image/jpeg', 'image/png', 'image/webp'. Please convert the image to a supported format before reading.",
      }
    `);
  });

  it("should return error text for binary file with known MIME type", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./archive.zip" },
      output: {
        filePath: "./archive.zip",
        mimeType: "application/zip",
        reason: "binary-file",
        state: "unsupported-format",
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "error-text",
        "value": "Cannot read binary file (application/zip): ./archive.zip. Consider using command-line tools or scripts to extract or convert the file contents if needed.",
      }
    `);
  });

  it("should return error text for binary file with no MIME type", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./unknown.bin" },
      output: {
        filePath: "./unknown.bin",
        reason: "binary-file",
        state: "unsupported-format",
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "error-text",
        "value": "Cannot read binary file with unknown MIME type: ./unknown.bin. Consider using command-line tools or scripts to extract or convert the file contents if needed.",
      }
    `);
  });

  it("should return content with media block for image files", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./photo.png" },
      output: {
        base64Data: "abc123",
        filePath: "./photo.png",
        mimeType: "image/png",
        state: "image",
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "content",
        "value": [
          {
            "text": "Image file: ./photo.png.",
            "type": "text",
          },
          {
            "data": "abc123",
            "mediaType": "image/png",
            "type": "media",
          },
        ],
      }
    `);
  });

  it("should return content with media block for pdf files", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./doc.pdf" },
      output: {
        base64Data: "abc123",
        filePath: "./doc.pdf",
        mimeType: "application/pdf",
        state: "pdf",
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "content",
        "value": [
          {
            "text": "PDF file: ./doc.pdf.",
            "type": "text",
          },
          {
            "data": "abc123",
            "mediaType": "application/pdf",
            "type": "media",
          },
        ],
      }
    `);
  });

  it("should return content with media block for audio files", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./sound.mp3" },
      output: {
        base64Data: "abc123",
        filePath: "./sound.mp3",
        mimeType: "audio/mpeg",
        state: "audio",
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "content",
        "value": [
          {
            "text": "Audio file: ./sound.mp3.",
            "type": "text",
          },
          {
            "data": "abc123",
            "mediaType": "audio/mpeg",
            "type": "media",
          },
        ],
      }
    `);
  });

  it("should return content with media block for video files", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./clip.mp4" },
      output: {
        base64Data: "abc123",
        filePath: "./clip.mp4",
        mimeType: "video/mp4",
        state: "video",
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "content",
        "value": [
          {
            "text": "Video file: ./clip.mp4.",
            "type": "text",
          },
          {
            "data": "abc123",
            "mediaType": "video/mp4",
            "type": "media",
          },
        ],
      }
    `);
  });

  it("should format entire file content", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./foo.ts" },
      output: {
        content: "const x = 1;\nconst y = 2;",
        displayedLines: 2,
        filePath: "./foo.ts",
        hasMoreLines: false,
        offset: 1,
        state: "exists",
        totalLines: 2,
        truncatedByBytes: false,
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "text",
        "value": "<path>./foo.ts</path>
      <content>
         1→const x = 1;
         2→const y = 2;
      </content>",
      }
    `);
  });

  it("should format partial file with hidden lines before and after", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./foo.ts", limit: 3, offset: 5 },
      output: {
        content: "line5\nline6\nline7",
        displayedLines: 3,
        filePath: "./foo.ts",
        hasMoreLines: true,
        offset: 5,
        state: "exists",
        totalLines: 20,
        truncatedByBytes: false,
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "text",
        "value": "<path>./foo.ts</path>
      <content lines="lines 5-7 (total 20 lines)">
      ... 4 lines not shown ...
         5→line5
         6→line6
         7→line7
      ... 13 lines not shown ...

      (Use offset parameter to read beyond line 8)
      </content>",
      }
    `);
  });

  it("should show byte-cap truncation message", () => {
    const result = ReadFile.toModelOutput({
      input: { explanation: "read", filePath: "./big.ts" },
      output: {
        content: "line1\nline2",
        displayedLines: 2,
        filePath: "./big.ts",
        hasMoreLines: true,
        offset: 1,
        state: "exists",
        totalLines: 500,
        truncatedByBytes: true,
      },
      toolCallId: "123",
    });
    expect(result).toMatchInlineSnapshot(`
      {
        "type": "text",
        "value": "<path>./big.ts</path>
      <content lines="lines 1-2 (total 500 lines)">
         1→line1
         2→line2
      ... 498 lines not shown (output capped at 50KB) ...

      (Use offset parameter to read beyond line 2)
      </content>",
      }
    `);
  });
});
