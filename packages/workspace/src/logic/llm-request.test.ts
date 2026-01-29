import {
  APICallError,
  type LanguageModelV3Prompt,
  type LanguageModelV3StreamPart,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ActorRefFrom,
  type AnyActorRef,
  createActor,
  setup,
  waitFor,
} from "xstate";

import { Store } from "../lib/store";
import { RelativePathSchema } from "../schemas/paths";
import { type SessionMessage } from "../schemas/session/message";
import { SessionMessagePart } from "../schemas/session/message-part";
import { StoreId } from "../schemas/store-id";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { TOOLS } from "../tools/all";
import { llmRequestLogic } from "./llm-request";

vi.mock(import("ulid"));

vi.mock(import("../lib/session-store-storage"));

vi.mock(import("../lib/get-current-date"));

describe("llmRequestLogic", () => {
  const projectAppConfig = createMockAppConfig(
    ProjectSubdomainSchema.parse(`mock`),
  );
  const sessionId = StoreId.newSessionId();
  const mockUsage = {
    inputTokens: {
      cacheRead: 1,
      cacheWrite: undefined,
      noCache: undefined,
      total: 2,
    },
    outputTokens: {
      reasoning: 4,
      text: undefined,
      total: 3,
    },
  };
  const mockTotalUsage = {
    inputTokenDetails: {
      cacheReadTokens: 1,
      cacheWriteTokens: undefined,
      noCacheTokens: undefined,
    },
    inputTokens: 2,
    outputTokenDetails: {
      reasoningTokens: 4,
      textTokens: undefined,
    },
    outputTokens: 3,
    totalTokens: 5,
  };
  let prompts: LanguageModelV3Prompt[] = [];
  const mockDate = new Date("2013-08-31T12:00:00.000Z");
  const mockMessageId = StoreId.newMessageId();
  const mockMessages: SessionMessage.ContextWithParts[] = [
    {
      id: mockMessageId,
      metadata: {
        agentName: "main",
        createdAt: mockDate,
        realRole: "assistant",
        sessionId,
      },
      parts: [
        {
          metadata: {
            createdAt: mockDate,
            id: StoreId.newPartId(),
            messageId: mockMessageId,
            sessionId,
          },
          text: "You are a helpful assistant.",
          type: "text",
        },
      ],
      role: "session-context",
    },
  ];

  beforeEach(async () => {
    prompts = [];
    await Store.saveSession(
      {
        createdAt: mockDate,
        id: sessionId,
        title: "Test session",
      },
      projectAppConfig,
    );
  });

  function createTestMachine({
    beforeStream,
    chunks,
    getMessages = () => Promise.resolve(mockMessages),
    provider = "mock-provider",
  }: {
    beforeStream?: () => Promise<void>;
    chunks: LanguageModelV3StreamPart[];
    getMessages?: () => Promise<SessionMessage.ContextWithParts[]>;
    provider?: string;
  }) {
    const mockLanguageModel = new MockLanguageModelV3({
      doStream: async ({ prompt }) => {
        if (beforeStream) {
          await beforeStream();
        }
        prompts.push(prompt);
        return {
          stream: simulateReadableStream({
            chunks: [
              ...chunks,
              {
                finishReason: { raw: "stop", unified: "stop" },
                logprobs: undefined,
                type: "finish",
                usage: {
                  inputTokens: {
                    cacheRead: undefined,
                    cacheWrite: undefined,
                    noCache: undefined,
                    total: 3,
                  },
                  outputTokens: {
                    reasoning: undefined,
                    text: undefined,
                    total: 10,
                  },
                },
              },
            ],
          }),
        };
      },
      provider,
    });

    const model = createMockAIGatewayModel(mockLanguageModel);

    return setup({
      actors: { llmRequest: llmRequestLogic },
      types: {
        events: {} as { type: "stop" },
      },
    }).createMachine({
      initial: "Start",
      on: {
        "*": {
          actions: ({ event }) => {
            // eslint-disable-next-line no-console
            console.warn("Unknown event", event);
          },
        },
        stop: ".Stopped",
      },
      states: {
        Done: { type: "final" },
        Error: { type: "final" },
        Start: {
          invoke: {
            input: () => ({
              agent: {
                agentTools: {},
                getMessages,
                getTools: () => Promise.resolve(Object.values(TOOLS)),
                name: "main",
                onFinish: () => Promise.resolve(),
                onStart: () => Promise.resolve(),
                shouldContinue: () => Promise.resolve(true),
              },
              appConfig: projectAppConfig,
              captureEvent: () => {
                // no-op
              },
              emitDeltas: true,
              model,
              self: { send: vi.fn() } as unknown as AnyActorRef,
              sessionId,
              stepCount: 1,
            }),
            onDone: "Done",
            onError: {
              actions: ({ event }) => {
                // eslint-disable-next-line no-console
                console.error("State machine error", event);
                throw new Error("Error");
              },
            },
            src: "llmRequest",
          },
        },
        Stopped: { type: "final" },
      },
    });
  }

  async function runTestMachine(machine: ReturnType<typeof createTestMachine>) {
    const actor = createActor(machine);
    actor.start();
    await waitFor(actor, (state) => state.status === "done");
    const sessionResult = await Store.getSessionWithMessagesAndParts(
      sessionId,
      projectAppConfig,
    );
    return sessionResult._unsafeUnwrap();
  }

  function messagesToSnapshot(messages: SessionMessage.Type[]) {
    return messages.map((message) => {
      if ("metadata" in message && "aiGatewayModel" in message.metadata) {
        const {
          aiGatewayModel: _aiGatewayModel,
          createdAt: _createdAt,
          finishedAt: _finishedAt,
          modelId: _modelId,
          msToFinish: _msToFinish,
          msToFirstChunk: _msToFirstChunk,
          providerId: _providerId,
          usage: _usage,
          ...metadata
        } = message.metadata;
        return {
          ...message,
          metadata,
        };
      }
      return message;
    });
  }

  it("should handle text streaming", async () => {
    const machine = createTestMachine({
      chunks: [
        { id: "1", type: "text-start" },
        { delta: "Hello, ", id: "1", type: "text-delta" },
        { delta: "world!", id: "1", type: "text-delta" },
        { id: "1", type: "text-end" },
        {
          finishReason: { raw: "stop", unified: "stop" },
          type: "finish",
          usage: mockUsage,
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000Z88888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000Z88888888888888889",
                "messageId": "msg_00000000Z88888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000Z8888888888888888A",
                "messageId": "msg_00000000Z88888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "state": "done",
              "text": "Hello, world!",
              "type": "text",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle tool streaming", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "test-call-1",
          toolName: "read_file",
          type: "tool-input-start",
        },
        {
          input: JSON.stringify({ filePath: "test-file.txt" }),
          toolCallId: "test-call-1",
          toolName: "read_file",
          type: "tool-call",
        },
        {
          finishReason: { raw: "stop", unified: "stop" },
          type: "finish",
          usage: mockUsage,
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000Z98888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2.5,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000Z98888888888888889",
                "messageId": "msg_00000000Z98888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "input": {
                "filePath": "test-file.txt",
              },
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "id": "prt_00000000Z9888888888888888A",
                "messageId": "msg_00000000Z98888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "providerExecuted": undefined,
              "state": "input-available",
              "toolCallId": "test-call-1",
              "type": "tool-read_file",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle reasoning events", async () => {
    const machine = createTestMachine({
      chunks: [
        { id: "1", type: "reasoning-start" },
        {
          delta: "First, I need to consider",
          id: "1",
          type: "reasoning-delta",
        },
        { delta: " the implications", id: "1", type: "reasoning-delta" },
        { delta: " of this approach", id: "1", type: "reasoning-delta" },
        { delta: " and then proceed", id: "1", type: "reasoning-delta" },
        { id: "1", type: "reasoning-end" },
        {
          finishReason: { raw: "stop", unified: "stop" },
          type: "finish",
          usage: mockUsage,
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZA8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZA8888888888888889",
                "messageId": "msg_00000000ZA8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZA888888888888888A",
                "messageId": "msg_00000000ZA8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "state": "done",
              "text": "First, I need to consider the implications of this approach and then proceed",
              "type": "reasoning",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle source events", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "test-source-id",
          providerMetadata: {
            testProvider: {
              test: "test",
            },
          },
          sourceType: "url",
          title: "Test Source",
          type: "source",
          url: "https://example.com/test-source",
        },
        {
          filename: "test-document.pdf",
          id: "test-doc-id",
          mediaType: "application/pdf",
          sourceType: "document",
          title: "Test Document",
          type: "source",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZB8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZB8888888888888889",
                "messageId": "msg_00000000ZB8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "id": "prt_00000000ZB888888888888888A",
                "messageId": "msg_00000000ZB8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "sourceId": "test-source-id",
              "title": "Test Source",
              "type": "source-url",
              "url": "https://example.com/test-source",
            },
            {
              "filename": "test-document.pdf",
              "mediaType": "application/pdf",
              "metadata": {
                "createdAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZB888888888888888B",
                "messageId": "msg_00000000ZB8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "sourceId": "test-doc-id",
              "title": "Test Document",
              "type": "source-document",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle incorrect input key name for tool call", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "1",
          toolName: "read_file",
          type: "tool-input-start",
        },
        {
          input: JSON.stringify({ invalid: "params" }),
          toolCallId: "1",
          toolName: "read_file",
          type: "tool-call",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZC8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZC8888888888888889",
                "messageId": "msg_00000000ZC8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "errorText": "Invalid input for tool read_file: Type validation failed: Value: {"invalid":"params"}.
      Error message: [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [
            "filePath"
          ],
          "message": "Invalid input: expected string, received undefined"
        }
      ]",
              "input": undefined,
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZC888888888888888A",
                "messageId": "msg_00000000ZC8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "providerExecuted": undefined,
              "rawInput": {
                "invalid": "params",
              },
              "state": "output-error",
              "toolCallId": "1",
              "type": "tool-read_file",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle invalid json for tool call", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "1",
          toolName: "read_file",
          type: "tool-input-start",
        },
        {
          input: "invalid json",
          toolCallId: "1",
          toolName: "read_file",
          type: "tool-call",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZD8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZD8888888888888889",
                "messageId": "msg_00000000ZD8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "errorText": "Invalid input for tool read_file: JSON parsing failed: Text: invalid json.
      Error message: Unexpected token 'i', "invalid json" is not valid JSON",
              "input": undefined,
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZD888888888888888A",
                "messageId": "msg_00000000ZD8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "providerExecuted": undefined,
              "rawInput": "invalid json",
              "state": "output-error",
              "toolCallId": "1",
              "type": "tool-read_file",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle incorrect input key name for tool call without start part", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          input: JSON.stringify({ invalid: "params" }),
          toolCallId: "1",
          toolName: "read_file",
          type: "tool-call",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZE8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZE8888888888888889",
                "messageId": "msg_00000000ZE8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "errorText": "Invalid input for tool read_file: Type validation failed: Value: {"invalid":"params"}.
      Error message: [
        {
          "expected": "string",
          "code": "invalid_type",
          "path": [
            "filePath"
          ],
          "message": "Invalid input: expected string, received undefined"
        }
      ]",
              "input": {
                "invalid": "params",
              },
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZE888888888888888A",
                "messageId": "msg_00000000ZE8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "rawInput": {
                "invalid": "params",
              },
              "state": "output-error",
              "toolCallId": "1",
              "type": "tool-unavailable",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle non-existent tool name", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "1",
          toolName: "non_existent_tool",
          type: "tool-input-start",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZF8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2.5,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZF8888888888888889",
                "messageId": "msg_00000000ZF8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "input": undefined,
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "id": "prt_00000000ZF888888888888888A",
                "messageId": "msg_00000000ZF8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "providerExecuted": undefined,
              "state": "input-streaming",
              "toolCallId": "1",
              "type": "tool-unavailable",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle non-existent tool name with call part", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "1",
          toolName: "non_existent_tool",
          type: "tool-input-start",
        },
        {
          input: JSON.stringify({ unknown: "params" }),
          toolCallId: "1",
          toolName: "non_existent_tool",
          type: "tool-call",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZG8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZG8888888888888889",
                "messageId": "msg_00000000ZG8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "errorText": "Model tried to call unavailable tool 'non_existent_tool'. Available tools: choose, edit_file, generate_image, glob, grep, read_file, run_diagnostics, run_shell_command, think, unavailable, write_file.",
              "input": undefined,
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZG888888888888888A",
                "messageId": "msg_00000000ZG8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "providerExecuted": undefined,
              "rawInput": {
                "unknown": "params",
              },
              "state": "output-error",
              "toolCallId": "1",
              "type": "tool-unavailable",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle non-existent tool name with start part", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "1",
          toolName: "read_file",
          type: "tool-input-start",
        },
        {
          input: JSON.stringify({ filePath: "test.txt" }),
          toolCallId: "1",
          toolName: "non_existent_tool",
          type: "tool-call",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZH8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZH8888888888888889",
                "messageId": "msg_00000000ZH8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "errorText": "Model tried to call unavailable tool 'non_existent_tool'. Available tools: choose, edit_file, generate_image, glob, grep, read_file, run_diagnostics, run_shell_command, think, unavailable, write_file.",
              "input": undefined,
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZH888888888888888A",
                "messageId": "msg_00000000ZH8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "providerExecuted": undefined,
              "rawInput": {
                "filePath": "test.txt",
              },
              "state": "output-error",
              "toolCallId": "1",
              "type": "tool-read_file",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle non-existent tool name without start part", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          input: JSON.stringify({ filePath: "test.txt" }),
          toolCallId: "1",
          toolName: "non_existent_tool",
          type: "tool-call",
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZJ8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZJ8888888888888889",
                "messageId": "msg_00000000ZJ8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "errorText": "Model tried to call unavailable tool 'non_existent_tool'. Available tools: choose, edit_file, generate_image, glob, grep, read_file, run_diagnostics, run_shell_command, think, unavailable, write_file.",
              "input": {
                "filePath": "test.txt",
              },
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "endedAt": 2013-08-31T12:00:05.000Z,
                "id": "prt_00000000ZJ888888888888888A",
                "messageId": "msg_00000000ZJ8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "rawInput": {
                "filePath": "test.txt",
              },
              "state": "output-error",
              "toolCallId": "1",
              "type": "tool-unavailable",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  it("should handle call provider metadata on tool part", async () => {
    const machine = createTestMachine({
      chunks: [
        {
          id: "test-call-1",
          toolName: "read_file",
          type: "tool-input-start",
        },
        {
          input: JSON.stringify({ filePath: "test-file.txt" }),
          providerMetadata: {
            anthropic: {
              cacheCreationInputTokens: 100,
              cacheReadInputTokens: 50,
            },
          },
          toolCallId: "test-call-1",
          toolName: "read_file",
          type: "tool-call",
        },
        {
          finishReason: { raw: "stop", unified: "stop" },
          type: "finish",
          usage: mockUsage,
        },
      ],
    });
    const { messages } = await runTestMachine(machine);
    expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
      [
        {
          "id": "msg_00000000018888888888888889",
          "metadata": {
            "agentName": "main",
            "createdAt": 2013-08-31T12:00:00.000Z,
            "realRole": "assistant",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:00.000Z,
                "id": "prt_0000000001888888888888888A",
                "messageId": "msg_00000000018888888888888889",
                "sessionId": "ses_00000000018888888888888888",
              },
              "text": "You are a helpful assistant.",
              "type": "text",
            },
          ],
          "role": "session-context",
        },
        {
          "id": "msg_00000000ZK8888888888888888",
          "metadata": {
            "completionTokensPerSecond": 2.5,
            "finishReason": "stop",
            "sessionId": "ses_00000000018888888888888888",
          },
          "parts": [
            {
              "metadata": {
                "createdAt": 2013-08-31T12:00:02.000Z,
                "id": "prt_00000000ZK8888888888888889",
                "messageId": "msg_00000000ZK8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
                "stepCount": 1,
              },
              "type": "step-start",
            },
            {
              "callProviderMetadata": {
                "anthropic": {
                  "cacheCreationInputTokens": 100,
                  "cacheReadInputTokens": 50,
                },
              },
              "input": {
                "filePath": "test-file.txt",
              },
              "metadata": {
                "createdAt": 2013-08-31T12:00:04.000Z,
                "id": "prt_00000000ZK888888888888888A",
                "messageId": "msg_00000000ZK8888888888888888",
                "sessionId": "ses_00000000018888888888888888",
              },
              "providerExecuted": undefined,
              "state": "input-available",
              "toolCallId": "test-call-1",
              "type": "tool-read_file",
            },
          ],
          "role": "assistant",
        },
      ]
    `);
  });

  describe("stream errors", () => {
    it("should handle api call errors", async () => {
      const mockError = new APICallError({
        cause: new Error("API call failed"),
        message: "Failed to process error response",
        requestBodyValues: {},
        responseHeaders: {},
        statusCode: 500,
        url: "https://api.openai.com/v1/chat/completions",
      });

      const machine = createTestMachine({
        beforeStream: () => {
          throw mockError;
        },
        chunks: [],
      });
      const { messages } = await runTestMachine(machine);
      expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
        [
          {
            "id": "msg_00000000018888888888888889",
            "metadata": {
              "agentName": "main",
              "createdAt": 2013-08-31T12:00:00.000Z,
              "realRole": "assistant",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:00.000Z,
                  "id": "prt_0000000001888888888888888A",
                  "messageId": "msg_00000000018888888888888889",
                  "sessionId": "ses_00000000018888888888888888",
                },
                "text": "You are a helpful assistant.",
                "type": "text",
              },
            ],
            "role": "session-context",
          },
          {
            "id": "msg_00000000ZM8888888888888888",
            "metadata": {
              "error": {
                "kind": "api-call",
                "message": "Failed to process error response",
                "name": "AI_APICallError",
                "responseBody": undefined,
                "statusCode": 500,
                "url": "https://api.openai.com/v1/chat/completions",
              },
              "finishReason": "unknown",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:02.000Z,
                  "id": "prt_00000000ZM8888888888888889",
                  "messageId": "msg_00000000ZM8888888888888888",
                  "sessionId": "ses_00000000018888888888888888",
                  "stepCount": 1,
                },
                "type": "step-start",
              },
            ],
            "role": "assistant",
          },
        ]
      `);
    });

    it("should handle aborted errors", async () => {
      let actor: ActorRefFrom<typeof machine> | null = null;
      const machine = createTestMachine({
        beforeStream: async () => {
          actor?.send({ type: "stop" });
          await Promise.resolve();
        },
        chunks: [],
      });

      actor = createActor(machine);
      actor.start();
      await waitFor(actor, (state) => state.status === "done");
      const sessionResult = await Store.getSessionWithMessagesAndParts(
        sessionId,
        projectAppConfig,
      );
      const messages = sessionResult._unsafeUnwrap().messages;
      expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
        [
          {
            "id": "msg_00000000018888888888888889",
            "metadata": {
              "agentName": "main",
              "createdAt": 2013-08-31T12:00:00.000Z,
              "realRole": "assistant",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:00.000Z,
                  "id": "prt_0000000001888888888888888A",
                  "messageId": "msg_00000000018888888888888889",
                  "sessionId": "ses_00000000018888888888888888",
                },
                "text": "You are a helpful assistant.",
                "type": "text",
              },
            ],
            "role": "session-context",
          },
          {
            "id": "msg_00000000ZN8888888888888888",
            "metadata": {
              "error": {
                "kind": "aborted",
                "message": "Aborted",
              },
              "finishReason": "aborted",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:02.000Z,
                  "id": "prt_00000000ZN8888888888888889",
                  "messageId": "msg_00000000ZN8888888888888888",
                  "sessionId": "ses_00000000018888888888888888",
                  "stepCount": 1,
                },
                "type": "step-start",
              },
            ],
            "role": "assistant",
          },
        ]
      `);
    });

    it("should handle unknown errors", async () => {
      const machine = createTestMachine({
        beforeStream: () => {
          throw new Error("Unknown error");
        },
        chunks: [],
      });
      const { messages } = await runTestMachine(machine);
      expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
        [
          {
            "id": "msg_00000000018888888888888889",
            "metadata": {
              "agentName": "main",
              "createdAt": 2013-08-31T12:00:00.000Z,
              "realRole": "assistant",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:00.000Z,
                  "id": "prt_0000000001888888888888888A",
                  "messageId": "msg_00000000018888888888888889",
                  "sessionId": "ses_00000000018888888888888888",
                },
                "text": "You are a helpful assistant.",
                "type": "text",
              },
            ],
            "role": "session-context",
          },
          {
            "id": "msg_00000000ZP8888888888888888",
            "metadata": {
              "error": {
                "kind": "unknown",
                "message": "Unknown error",
              },
              "finishReason": "unknown",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:02.000Z,
                  "id": "prt_00000000ZP8888888888888889",
                  "messageId": "msg_00000000ZP8888888888888888",
                  "sessionId": "ses_00000000018888888888888888",
                  "stepCount": 1,
                },
                "type": "step-start",
              },
            ],
            "role": "assistant",
          },
        ]
      `);
    });
  });

  describe("prompt messages", () => {
    const userMessageId = StoreId.newMessageId();
    const assistantMessageId = StoreId.newMessageId();
    const mockAssistantMessageMetadata = {
      createdAt: mockDate,
      finishReason: "stop" as const,
      modelId: "mock-model-id",
      providerId: "mock-provider",
      sessionId,
      usage: mockTotalUsage,
    };
    const readFilePart: SessionMessagePart.Type = {
      input: {
        filePath: "./test-file.txt",
      },
      metadata: {
        createdAt: mockDate,
        endedAt: mockDate,
        id: StoreId.newPartId(),
        messageId: assistantMessageId,
        sessionId,
      },
      output: {
        content: "test-file.txt content",
        displayedLines: 10,
        filePath: RelativePathSchema.parse("./test-file.txt"),
        hasMoreLines: false,
        offset: 0,
        state: "exists",
        totalLines: 10,
      },
      state: "output-available",
      toolCallId: StoreId.ToolCallSchema.parse("1"),
      type: "tool-read_file",
    };

    beforeEach(async () => {
      await Store.saveMessage(
        {
          id: userMessageId,
          metadata: {
            createdAt: mockDate,
            sessionId,
          },
          role: "user",
        },
        projectAppConfig,
      );
      await Store.saveParts(
        [
          {
            metadata: {
              createdAt: mockDate,
              id: StoreId.newPartId(),
              messageId: userMessageId,
              sessionId,
            },
            state: "done",
            text: "Do something",
            type: "text",
          },
        ],
        projectAppConfig,
      );

      await Store.saveMessage(
        {
          id: assistantMessageId,
          metadata: mockAssistantMessageMetadata,
          role: "assistant",
        },
        projectAppConfig,
      );
    });

    it("handles user and assistant messages", async () => {
      const machine = createTestMachine({
        chunks: [],
      });
      const actor = createActor(machine);
      actor.start();
      await waitFor(actor, (state) => state.status === "done");
      expect(prompts).toMatchInlineSnapshot(`
        [
          [
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "You are a helpful assistant.",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "Do something",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "user",
            },
          ],
        ]
      `);
    });

    it("handles one tool call", async () => {
      await Store.savePart(
        SessionMessagePart.coerce(readFilePart),
        projectAppConfig,
      );

      const machine = createTestMachine({
        chunks: [],
      });
      await runTestMachine(machine);
      expect(prompts).toMatchInlineSnapshot(`
        [
          [
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "You are a helpful assistant.",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "Do something",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "user",
            },
            {
              "content": [
                {
                  "input": {
                    "filePath": "./test-file.txt",
                  },
                  "providerExecuted": undefined,
                  "providerOptions": undefined,
                  "toolCallId": "1",
                  "toolName": "read_file",
                  "type": "tool-call",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "output": {
                    "type": "text",
                    "value": "Contents of ./test-file.txt (entire file):
           1→test-file.txt content",
                  },
                  "providerOptions": undefined,
                  "toolCallId": "1",
                  "toolName": "read_file",
                  "type": "tool-result",
                },
              ],
              "providerOptions": undefined,
              "role": "tool",
            },
          ],
        ]
      `);
    });

    it("handles two tool calls", async () => {
      await Store.saveParts(
        [
          readFilePart,
          {
            input: {
              content: "new content",
              filePath: "./output.txt",
            },
            metadata: {
              createdAt: mockDate,
              endedAt: mockDate,
              id: StoreId.newPartId(),
              messageId: assistantMessageId,
              sessionId,
            },
            output: {
              content: "new content",
              filePath: RelativePathSchema.parse("./output.txt"),
              isNewFile: true,
            },
            state: "output-available",
            toolCallId: StoreId.ToolCallSchema.parse("2"),
            type: "tool-write_file",
          },
        ],
        projectAppConfig,
      );

      const machine = createTestMachine({
        chunks: [],
      });
      await runTestMachine(machine);
      expect(prompts).toMatchInlineSnapshot(`
        [
          [
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "You are a helpful assistant.",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "Do something",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "user",
            },
            {
              "content": [
                {
                  "input": {
                    "filePath": "./test-file.txt",
                  },
                  "providerExecuted": undefined,
                  "providerOptions": undefined,
                  "toolCallId": "1",
                  "toolName": "read_file",
                  "type": "tool-call",
                },
                {
                  "input": {
                    "content": "new content",
                    "filePath": "./output.txt",
                  },
                  "providerExecuted": undefined,
                  "providerOptions": undefined,
                  "toolCallId": "2",
                  "toolName": "write_file",
                  "type": "tool-call",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "output": {
                    "type": "text",
                    "value": "Contents of ./test-file.txt (entire file):
           1→test-file.txt content",
                  },
                  "providerOptions": undefined,
                  "toolCallId": "1",
                  "toolName": "read_file",
                  "type": "tool-result",
                },
                {
                  "output": {
                    "type": "text",
                    "value": "Successfully wrote new file ./output.txt",
                  },
                  "providerOptions": undefined,
                  "toolCallId": "2",
                  "toolName": "write_file",
                  "type": "tool-result",
                },
              ],
              "providerOptions": undefined,
              "role": "tool",
            },
          ],
        ]
      `);
    });

    it("handles tool call with diagnostics reminder", async () => {
      await Store.saveParts(
        [
          {
            input: {
              content: "console.log('hi');",
              filePath: "./foo.ts",
            },
            metadata: {
              createdAt: mockDate,
              endedAt: mockDate,
              id: StoreId.newPartId(),
              messageId: assistantMessageId,
              sessionId,
            },
            output: {
              content: "console.log('hi');",
              filePath: RelativePathSchema.parse("./foo.ts"),
              isNewFile: true,
            },
            state: "output-available",
            toolCallId: StoreId.ToolCallSchema.parse("2"),
            type: "tool-write_file",
          },
        ],
        projectAppConfig,
      );

      const machine = createTestMachine({
        chunks: [],
      });
      await runTestMachine(machine);
      expect(prompts).toMatchInlineSnapshot(`
        [
          [
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "You are a helpful assistant.",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "Do something",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "user",
            },
            {
              "content": [
                {
                  "input": {
                    "content": "console.log('hi');",
                    "filePath": "./foo.ts",
                  },
                  "providerExecuted": undefined,
                  "providerOptions": undefined,
                  "toolCallId": "2",
                  "toolName": "write_file",
                  "type": "tool-call",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "output": {
                    "type": "text",
                    "value": "Successfully wrote new file ./foo.ts

        When you're done with your current set of changes to this file, you should call the run_diagnostics tool to check for any new errors.",
                  },
                  "providerOptions": undefined,
                  "toolCallId": "2",
                  "toolName": "write_file",
                  "type": "tool-result",
                },
              ],
              "providerOptions": undefined,
              "role": "tool",
            },
          ],
        ]
      `);
    });

    it("handles tool call errors", async () => {
      await Store.saveParts(
        [
          {
            errorText:
              "File is too large (300000 bytes). Maximum size is 256000 bytes",
            input: { filePath: "./test-file.txt" },
            metadata: {
              createdAt: mockDate,
              endedAt: mockDate,
              id: StoreId.newPartId(),
              messageId: assistantMessageId,
              sessionId,
            },
            state: "output-error",
            toolCallId: StoreId.ToolCallSchema.parse("1"),
            type: "tool-read_file",
          },
        ],
        projectAppConfig,
      );

      const machine = createTestMachine({
        chunks: [],
      });
      await runTestMachine(machine);
      expect(prompts).toMatchInlineSnapshot(`
        [
          [
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "You are a helpful assistant.",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "Do something",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "user",
            },
            {
              "content": [
                {
                  "input": {
                    "filePath": "./test-file.txt",
                  },
                  "providerExecuted": undefined,
                  "providerOptions": undefined,
                  "toolCallId": "1",
                  "toolName": "read_file",
                  "type": "tool-call",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "output": {
                    "type": "error-text",
                    "value": "File is too large (300000 bytes). Maximum size is 256000 bytes",
                  },
                  "providerOptions": undefined,
                  "toolCallId": "1",
                  "toolName": "read_file",
                  "type": "tool-result",
                },
              ],
              "providerOptions": undefined,
              "role": "tool",
            },
          ],
        ]
      `);
    });

    it("adds cache control to messages for Anthropic models", async () => {
      const secondMessageId = StoreId.newMessageId();
      await Store.saveMessage(
        {
          id: secondMessageId,
          metadata: mockAssistantMessageMetadata,
          role: "assistant",
        },
        projectAppConfig,
      );
      await Store.saveParts(
        [
          {
            metadata: {
              createdAt: mockDate,
              id: StoreId.newPartId(),
              messageId: secondMessageId,
              sessionId,
            },
            state: "done",
            text: "What would you like to do?",
            type: "text",
          },
        ],
        projectAppConfig,
      );
      const thirdMessageId = StoreId.newMessageId();
      await Store.saveMessage(
        {
          id: thirdMessageId,
          metadata: mockAssistantMessageMetadata,
          role: "assistant",
        },
        projectAppConfig,
      );
      await Store.saveParts(
        [
          {
            metadata: {
              createdAt: mockDate,
              id: StoreId.newPartId(),
              messageId: thirdMessageId,
              sessionId,
            },
            state: "done",
            text: "I'm ready to help you with that task.",
            type: "text",
          },
        ],
        projectAppConfig,
      );

      const machine = createTestMachine({
        chunks: [],
        provider: "anthropic",
      });
      await runTestMachine(machine);
      // Test that there are a maximum of 4 cache control markers
      const promptMessages = prompts[0];
      const anthropicCacheControlCount = promptMessages?.filter((message) => {
        return (
          message.providerOptions?.anthropic &&
          "cacheControl" in message.providerOptions.anthropic
        );
      }).length;
      expect(anthropicCacheControlCount).toBeLessThanOrEqual(4);
      expect(prompts).toMatchInlineSnapshot(`
        [
          [
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "You are a helpful assistant.",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "Do something",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "user",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "What would you like to do?",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
            {
              "content": [
                {
                  "providerOptions": undefined,
                  "text": "I'm ready to help you with that task.",
                  "type": "text",
                },
              ],
              "providerOptions": undefined,
              "role": "assistant",
            },
          ],
        ]
      `);
    });

    it("replaces stale agent messages", async () => {
      const staleDate = new Date("2013-08-31T10:00:00.000Z");
      const staleMessageId = StoreId.newMessageId();
      const oldText = "You are an old assistant that should be replaced.";

      await Store.saveMessageWithParts(
        {
          id: staleMessageId,
          metadata: {
            agentName: "main",
            createdAt: staleDate,
            realRole: "system",
            sessionId,
          },
          parts: [
            {
              metadata: {
                createdAt: staleDate,
                id: StoreId.newPartId(),
                messageId: staleMessageId,
                sessionId,
              },
              text: oldText,
              type: "text",
            },
          ],
          role: "session-context",
        },
        projectAppConfig,
      );

      const machine = createTestMachine({
        chunks: [
          { id: "1", type: "text-start" },
          { delta: "Response text", id: "1", type: "text-delta" },
          { id: "1", type: "text-end" },
        ],
      });

      const { messages } = await runTestMachine(machine);
      expect(
        JSON.stringify(messages),
        "Old message should be replaced",
      ).not.toContain(oldText);
      expect(messagesToSnapshot(messages)).toMatchInlineSnapshot(`
        [
          {
            "id": "msg_00000000018888888888888889",
            "metadata": {
              "agentName": "main",
              "createdAt": 2013-08-31T12:00:00.000Z,
              "realRole": "assistant",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:00.000Z,
                  "id": "prt_0000000001888888888888888A",
                  "messageId": "msg_00000000018888888888888889",
                  "sessionId": "ses_00000000018888888888888888",
                },
                "text": "You are a helpful assistant.",
                "type": "text",
              },
            ],
            "role": "session-context",
          },
          {
            "id": "msg_0000000001888888888888888B",
            "metadata": {
              "createdAt": 2013-08-31T12:00:00.000Z,
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:00.000Z,
                  "id": "prt_00000000ZV8888888888888888",
                  "messageId": "msg_0000000001888888888888888B",
                  "sessionId": "ses_00000000018888888888888888",
                },
                "state": "done",
                "text": "Do something",
                "type": "text",
              },
            ],
            "role": "user",
          },
          {
            "id": "msg_0000000001888888888888888C",
            "metadata": {
              "createdAt": 2013-08-31T12:00:00.000Z,
              "finishReason": "stop",
              "modelId": "mock-model-id",
              "providerId": "mock-provider",
              "sessionId": "ses_00000000018888888888888888",
              "usage": {
                "inputTokenDetails": {
                  "cacheReadTokens": 1,
                  "cacheWriteTokens": undefined,
                  "noCacheTokens": undefined,
                },
                "inputTokens": 2,
                "outputTokenDetails": {
                  "reasoningTokens": 4,
                  "textTokens": undefined,
                },
                "outputTokens": 3,
                "totalTokens": 5,
              },
            },
            "parts": [],
            "role": "assistant",
          },
          {
            "id": "msg_00000000ZV888888888888888B",
            "metadata": {
              "completionTokensPerSecond": 2,
              "finishReason": "stop",
              "sessionId": "ses_00000000018888888888888888",
            },
            "parts": [
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:02.000Z,
                  "id": "prt_00000000ZV888888888888888C",
                  "messageId": "msg_00000000ZV888888888888888B",
                  "sessionId": "ses_00000000018888888888888888",
                  "stepCount": 1,
                },
                "type": "step-start",
              },
              {
                "metadata": {
                  "createdAt": 2013-08-31T12:00:04.000Z,
                  "endedAt": 2013-08-31T12:00:05.000Z,
                  "id": "prt_00000000ZV888888888888888D",
                  "messageId": "msg_00000000ZV888888888888888B",
                  "sessionId": "ses_00000000018888888888888888",
                },
                "state": "done",
                "text": "Response text",
                "type": "text",
              },
            ],
            "role": "assistant",
          },
        ]
      `);
    });
  });
});
