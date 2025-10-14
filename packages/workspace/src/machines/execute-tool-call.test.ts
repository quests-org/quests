import mockFs from "mock-fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createActor, waitFor } from "xstate";

import { Store } from "../lib/store";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { StoreId } from "../schemas/store-id";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../test/helpers/mock-app-config";
import { executeToolCallMachine } from "./execute-tool-call";

vi.mock(import("ulid"));
vi.mock(import("../lib/session-store-storage"));
vi.mock(import("../lib/get-current-date"));
vi.mock(import("../lib/execa-electron-node"), () => ({
  execaElectronNode: vi.fn(),
}));

describe("executeToolCallMachine", () => {
  const projectAppConfig = createMockAppConfig(
    ProjectSubdomainSchema.parse("test"),
  );
  const sessionId = StoreId.newSessionId();
  const messageId = StoreId.newMessageId();
  const mockDate = new Date("2025-01-01T00:00:00.000Z");

  beforeEach(async () => {
    const { execaElectronNode } = await import("../lib/execa-electron-node");
    vi.mocked(execaElectronNode).mockImplementation(
      async (file, args, _options) => {
        const command = [file, ...(args ?? [])].join(" ");

        if (command.includes("throw-error")) {
          throw new Error("Shell command failed");
        }

        if (command.includes("hang-command")) {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                exitCode: 0,
                stderr: "mocked stderr",
                stdout: "mocked stdout",
              });
            }, 100);
          });
        }

        return {
          exitCode: 0,
          stderr: "mocked stderr",
          stdout: "mocked stdout",
        };
      },
    );

    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [projectAppConfig.folderName]: {
          "nonexistent.js": "",
          "package.json": "{}",
          "test.txt": "Hello, world!",
        },
      },
    });

    await Store.saveSession(
      {
        createdAt: mockDate,
        id: sessionId,
        title: "Test session",
      },
      projectAppConfig,
    );

    await Store.saveMessage(
      {
        id: messageId,
        metadata: {
          createdAt: mockDate,
          finishReason: "stop",
          modelId: "mock-model-id",
          providerId: "mock-provider-id",
          sessionId,
        },
        role: "assistant",
      },
      projectAppConfig,
    );
  });

  afterEach(() => {
    mockFs.restore();
    vi.clearAllMocks();
  });

  function createTestActor({
    part,
  }: {
    part: SessionMessagePart.ToolPartInputAvailable;
  }) {
    const actor = createActor(executeToolCallMachine, {
      input: {
        appConfig: projectAppConfig,
        part,
      },
    });

    return actor;
  }

  async function runTestMachine(actor: ReturnType<typeof createTestActor>) {
    actor.start();
    await waitFor(actor, (state) => state.status === "done");
    const sessionResult = await Store.getSessionWithMessagesAndParts(
      sessionId,
      projectAppConfig,
    );
    return sessionResult._unsafeUnwrap();
  }

  function createShellCommandPart(
    command: string,
    timeoutMs = 1000,
  ): SessionMessagePart.ToolPartInputAvailable {
    return {
      input: {
        command,
        explanation: "Installing packages",
        timeoutMs,
      },
      metadata: {
        createdAt: mockDate,
        id: StoreId.newPartId(),
        messageId,
        sessionId,
      },
      state: "input-available",
      toolCallId: StoreId.ToolCallSchema.parse("test_tool_call_1"),
      type: "tool-run_shell_command",
    };
  }

  describe("with successful shell command", () => {
    it("should execute shell command successfully", async () => {
      const part = createShellCommandPart("pnpm install");
      await Store.savePart(part, projectAppConfig);

      const actor = createTestActor({ part });
      await runTestMachine(actor);

      // Verify the part was updated with output
      const updatedSession = await Store.getSessionWithMessagesAndParts(
        sessionId,
        projectAppConfig,
      );
      const session = updatedSession._unsafeUnwrap();
      const updatedPart = session.messages
        .flatMap((m) => m.parts)
        .find(
          (p) =>
            p.type === "tool-run_shell_command" &&
            p.toolCallId === "test_tool_call_1",
        );

      expect(updatedPart).toMatchInlineSnapshot(`
        {
          "input": {
            "command": "pnpm install",
            "explanation": "Installing packages",
            "timeoutMs": 1000,
          },
          "metadata": {
            "createdAt": 2025-01-01T00:00:00.000Z,
            "endedAt": 2013-08-31T12:00:00.000Z,
            "id": "prt_00000000Z88888888888888888",
            "messageId": "msg_00000000018888888888888889",
            "sessionId": "ses_00000000018888888888888888",
          },
          "output": {
            "command": "pnpm install",
            "exitCode": 0,
            "stderr": "mocked stderr",
            "stdout": "mocked stdout",
          },
          "state": "output-available",
          "toolCallId": "test_tool_call_1",
          "type": "tool-run_shell_command",
        }
      `);
    });
  });

  describe("with shell command that throws", () => {
    it("should handle shell command errors", async () => {
      const part = createShellCommandPart("pnpm throw-error");
      await Store.savePart(part, projectAppConfig);

      const actor = createTestActor({ part });
      await runTestMachine(actor);

      // Verify the part was updated with error
      const updatedSession = await Store.getSessionWithMessagesAndParts(
        sessionId,
        projectAppConfig,
      );
      const session = updatedSession._unsafeUnwrap();
      const updatedPart = session.messages
        .flatMap((m) => m.parts)
        .find(
          (p) =>
            p.type === "tool-run_shell_command" &&
            p.toolCallId === "test_tool_call_1",
        );

      expect(updatedPart).toMatchInlineSnapshot(`
        {
          "errorText": "Tool call execution failed: Shell command failed",
          "input": {
            "command": "pnpm throw-error",
            "explanation": "Installing packages",
            "timeoutMs": 1000,
          },
          "metadata": {
            "createdAt": 2025-01-01T00:00:00.000Z,
            "endedAt": 2013-08-31T12:00:00.000Z,
            "id": "prt_00000000Z98888888888888888",
            "messageId": "msg_00000000018888888888888889",
            "sessionId": "ses_00000000018888888888888888",
          },
          "state": "output-error",
          "toolCallId": "test_tool_call_1",
          "type": "tool-run_shell_command",
        }
      `);
    });
  });

  describe("with hanging shell command", () => {
    it("should handle hanging shell command", async () => {
      const part = createShellCommandPart("pnpm hang-command", 10); // Very short timeout to trigger cancellation
      await Store.savePart(part, projectAppConfig);

      const actor = createTestActor({ part });
      await runTestMachine(actor);

      // Verify the part was updated with cancellation
      const updatedSession = await Store.getSessionWithMessagesAndParts(
        sessionId,
        projectAppConfig,
      );
      const session = updatedSession._unsafeUnwrap();
      const updatedPart = session.messages
        .flatMap((m) => m.parts)
        .find(
          (p) =>
            p.type === "tool-run_shell_command" &&
            p.toolCallId === "test_tool_call_1",
        );

      expect(updatedPart).toMatchInlineSnapshot(`
        {
          "errorText": "Tool call execution was cancelled: timeout",
          "input": {
            "command": "pnpm hang-command",
            "explanation": "Installing packages",
            "timeoutMs": 10,
          },
          "metadata": {
            "createdAt": 2025-01-01T00:00:00.000Z,
            "endedAt": 2013-08-31T12:00:00.000Z,
            "id": "prt_00000000ZA8888888888888888",
            "messageId": "msg_00000000018888888888888889",
            "sessionId": "ses_00000000018888888888888888",
          },
          "state": "output-error",
          "toolCallId": "test_tool_call_1",
          "type": "tool-run_shell_command",
        }
      `);
    });
  });

  describe("with read file tool", () => {
    it("should execute read file successfully", async () => {
      const part: SessionMessagePart.ToolPartInputAvailable = {
        input: {
          explanation: "Reading test file",
          filePath: "test.txt",
        },
        metadata: {
          createdAt: mockDate,
          id: StoreId.newPartId(),
          messageId,
          sessionId,
        },
        state: "input-available",
        toolCallId: StoreId.ToolCallSchema.parse("test_tool_call_2"),
        type: "tool-read_file",
      };

      await Store.savePart(part, projectAppConfig);

      const actor = createTestActor({ part });
      await runTestMachine(actor);

      // Verify the part was updated with output
      const updatedSession = await Store.getSessionWithMessagesAndParts(
        sessionId,
        projectAppConfig,
      );
      const session = updatedSession._unsafeUnwrap();
      const updatedPart = session.messages
        .flatMap((m) => m.parts)
        .find(
          (p) =>
            p.type === "tool-read_file" && p.toolCallId === "test_tool_call_2",
        );

      expect(updatedPart).toMatchInlineSnapshot(`
        {
          "input": {
            "explanation": "Reading test file",
            "filePath": "test.txt",
          },
          "metadata": {
            "createdAt": 2025-01-01T00:00:00.000Z,
            "endedAt": 2013-08-31T12:00:00.000Z,
            "id": "prt_00000000ZB8888888888888888",
            "messageId": "msg_00000000018888888888888889",
            "sessionId": "ses_00000000018888888888888888",
          },
          "output": {
            "content": "Hello, world!",
            "displayedLines": 1,
            "filePath": "./test.txt",
            "hasMoreLines": false,
            "offset": 0,
            "state": "exists",
            "totalLines": 1,
          },
          "state": "output-available",
          "toolCallId": "test_tool_call_2",
          "type": "tool-read_file",
        }
      `);
    });

    it("should handle file not found", async () => {
      const part: SessionMessagePart.ToolPartInputAvailable = {
        input: {
          explanation: "Reading nonexistent file",
          filePath: "nonexistent.txt",
        },
        metadata: {
          createdAt: mockDate,
          id: StoreId.newPartId(),
          messageId,
          sessionId,
        },
        state: "input-available",
        toolCallId: StoreId.ToolCallSchema.parse("test_tool_call_3"),
        type: "tool-read_file",
      };

      await Store.savePart(part, projectAppConfig);

      const actor = createTestActor({ part });
      await runTestMachine(actor);

      // Verify the part was updated with "not found" output (not error)
      const updatedSession = await Store.getSessionWithMessagesAndParts(
        sessionId,
        projectAppConfig,
      );
      const session = updatedSession._unsafeUnwrap();
      const updatedPart = session.messages
        .flatMap((m) => m.parts)
        .find(
          (p) =>
            p.type === "tool-read_file" && p.toolCallId === "test_tool_call_3",
        );

      expect(updatedPart).toMatchInlineSnapshot(`
        {
          "input": {
            "explanation": "Reading nonexistent file",
            "filePath": "nonexistent.txt",
          },
          "metadata": {
            "createdAt": 2025-01-01T00:00:00.000Z,
            "endedAt": 2013-08-31T12:00:00.000Z,
            "id": "prt_00000000ZC8888888888888888",
            "messageId": "msg_00000000018888888888888889",
            "sessionId": "ses_00000000018888888888888888",
          },
          "output": {
            "filePath": "./nonexistent.txt",
            "state": "does-not-exist",
            "suggestions": [
              "nonexistent.js",
            ],
          },
          "state": "output-available",
          "toolCallId": "test_tool_call_3",
          "type": "tool-read_file",
        }
      `);
    });
  });
});
