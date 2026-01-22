import { type LanguageModelV2StreamPart } from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV2 } from "ai/test";
import mockFs from "mock-fs";
import { ok } from "neverthrow";
import path from "node:path";
import { pick } from "radashi";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import {
  type ActorRefFrom,
  type AnyActorRef,
  createActor,
  waitFor,
} from "xstate";

import { setupAgent } from "../agents/create-agent";
import { mainAgent } from "../agents/main";
import { type AnyAgent } from "../agents/types";
import { type AppConfig } from "../lib/app-config/types";
import { Store } from "../lib/store";
import { type RelativePath } from "../schemas/paths";
import { type SessionMessage } from "../schemas/session/message";
import { StoreId } from "../schemas/store-id";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../test/helpers/mock-app-config";
import { sessionToShorthand } from "../test/helpers/session-to-shorthand";
import { TOOLS } from "../tools/all";
import { sessionMachine } from "./session";

vi.mock(import("ulid"));
vi.mock(import("../lib/session-store-storage"));
vi.mock(import("../lib/get-current-date"));
vi.mock(import("dugite"));
vi.mock(import("execa"), () => ({
  execa: vi.fn(),
}));

type Part =
  Awaited<
    ReturnType<MockLanguageModelV2["doStream"]>
  >["stream"] extends ReadableStream<infer T>
    ? T
    : never;

describe("sessionMachine", () => {
  const projectFolder = "pj-test";
  const projectAppConfig = createMockAppConfig(
    ProjectSubdomainSchema.parse(projectFolder),
  );
  const defaultSessionId = StoreId.newSessionId();
  const mockDate = new Date("2025-01-01T00:00:00.000Z");
  const defaultMessageId = StoreId.newMessageId();
  const defaultQueuedMessage: SessionMessage.UserWithParts = {
    id: defaultMessageId,
    metadata: {
      createdAt: mockDate,
      sessionId: defaultSessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: mockDate,
          id: StoreId.newPartId(),
          messageId: defaultMessageId,
          sessionId: defaultSessionId,
        },
        text: "Hello, I need help with something.",
        type: "text",
      },
    ],
    role: "user",
  };
  const mockUsage = {
    cachedInputTokens: 1,
    inputTokens: 2,
    outputTokens: 3,
    reasoningTokens: 4,
    totalTokens: 9,
  };

  const readFileChunks = [
    {
      id: "test-call-1",
      toolName: "read_file",
      type: "tool-input-start",
    },
    {
      input: JSON.stringify({
        filePath: "test.txt",
      }),
      toolCallId: "test-call-1",
      toolName: "read_file",
      type: "tool-call",
    },
  ] as const satisfies LanguageModelV2StreamPart[];

  const writeFileChunks = [
    {
      id: "test-call-2",
      toolName: "write_file",
      type: "tool-input-start",
    },
    {
      input: JSON.stringify({
        content: "console.log('Hello, world!');",
        filePath: "test.txt",
      }),
      toolCallId: "test-call-2",
      toolName: "write_file",
      type: "tool-call",
    },
  ] as const satisfies LanguageModelV2StreamPart[];

  const finishChunks = [
    { id: "1", type: "text-start" },
    { delta: "I'm done.", id: "1", type: "text-delta" },
    { id: "1", type: "text-end" },
    { finishReason: "stop", type: "finish", usage: mockUsage },
  ] as const satisfies LanguageModelV2StreamPart[];

  const chooseToolCallId = "test-call-choose";
  const chooseChunks = [
    {
      id: chooseToolCallId,
      toolName: "choose",
      type: "tool-input-start",
    },
    {
      input: JSON.stringify({
        choices: ["Continue", "Stop", "Restart"],
        question: "What would you like to do next?",
      }),
      toolCallId: chooseToolCallId,
      toolName: "choose",
      type: "tool-call",
    },
  ] as const satisfies LanguageModelV2StreamPart[];

  beforeEach(async () => {
    const { execa } = await import("execa");
    (execa as unknown as Mock).mockImplementation(
      // eslint-disable-next-line unicorn/consistent-function-scoping
      () => () =>
        Promise.resolve({
          exitCode: 0,
          stderr: "mocked stderr",
          stdout: "mocked stdout",
        }),
    );
    await Store.saveSession(
      {
        createdAt: mockDate,
        id: defaultSessionId,
        title: "Test session",
      },
      projectAppConfig,
    );
  });

  afterEach(() => {
    mockFs.restore();
    vi.restoreAllMocks();
  });

  function createTestActor({
    agent = mainAgent,
    appConfig = projectAppConfig,
    baseLLMRetryDelayMs = 1000,
    chunkDelayInMs = [],
    chunkSets = [],
    initialChunkDelaysMs = [],
    llmRequestChunkTimeoutMs = 120_000,
    maxStepCount,
    queuedMessages = [defaultQueuedMessage],
    sessionId = defaultSessionId,
  }: {
    agent?: AnyAgent;
    appConfig?: AppConfig;
    baseLLMRetryDelayMs?: number;
    chunkDelayInMs?: number[];
    chunkSets?: Part[][];
    initialChunkDelaysMs?: number[];
    llmRequestChunkTimeoutMs?: number;
    maxStepCount?: number;
    queuedMessages?: SessionMessage.UserWithParts[];
    sessionId?: StoreId.Session;
  }) {
    let currentChunkIndex = 0;
    const mockLanguageModel = new MockLanguageModelV2({
      // eslint-disable-next-line @typescript-eslint/require-await
      doStream: async () => {
        const currentChunks = chunkSets[currentChunkIndex];
        if (!currentChunks) {
          throw new Error("No chunks left");
        }

        const chunkIndex = currentChunkIndex;
        currentChunkIndex++;

        return {
          rawCall: { rawPrompt: null, rawSettings: {} },
          stream: simulateReadableStream({
            chunkDelayInMs: chunkDelayInMs[chunkIndex],
            chunks: [
              ...currentChunks,
              {
                finishReason: "stop",
                logprobs: undefined,
                type: "finish",
                usage: {
                  cachedInputTokens: 0,
                  inputTokens: 3,
                  outputTokens: 10,
                  reasoningTokens: 0,
                  totalTokens: 0,
                },
              },
            ],
            initialDelayInMs: initialChunkDelaysMs[chunkIndex],
          }),
        };
      },
    });

    const model = createMockAIGatewayModel(mockLanguageModel);

    const actor = createActor(sessionMachine, {
      input: {
        agent,
        appConfig,
        baseLLMRetryDelayMs,
        llmRequestChunkTimeoutMs,
        maxStepCount,
        model,
        parentRef: {
          send: vi
            .fn()
            .mockImplementation(
              (event: { type: string; value: { error?: unknown } }) => {
                if (event.value.error) {
                  // eslint-disable-next-line no-console
                  console.error("session.done error", event.value.error);
                }
              },
            ),
        } as unknown as AnyActorRef,
        queuedMessages,
        sessionId,
      },
      // Uncomment to debug
      // inspect(event) {
      //   let name: string;
      //   if (typeof event.actorRef.src === "string") {
      //     name = event.actorRef.src;
      //   } else if (
      //     typeof event.actorRef.src === "object" &&
      //     "id" in event.actorRef.src
      //   ) {
      //     name = (event.actorRef.src as { id: string }).id;
      //   } else {
      //     name = "";
      //   }
      //   switch (event.type) {
      //     case "@xstate.action": {
      //       if (
      //         !event.action.type.startsWith("xstate.") &&
      //         event.action.type !== "actions"
      //       ) {
      //         // eslint-disable-next-line no-console
      //         console.log("action", name, event.actorRef.id, event.action.type);
      //       }

      //       break;
      //     }
      //     case "@xstate.event": {
      //       if (!event.event.type.startsWith("xstate.")) {
      //         // eslint-disable-next-line no-console
      //         console.log(
      //           "event",
      //           name,
      //           event.actorRef.id,
      //           event.event.type,
      //           "value" in event.event ? event.event.value : event.event,
      //         );
      //       }

      //       break;
      //     }
      //   }
      // },
    });

    return actor;
  }

  async function runTestMachine(actor: ActorRefFrom<typeof sessionMachine>) {
    actor.start();
    await waitFor(actor, (state) => state.status === "done");
    return Store.getSessionWithMessagesAndParts(
      defaultSessionId,
      projectAppConfig,
    );
  }

  describe("with non empty repo", () => {
    beforeEach(() => {
      mockFs({
        [MOCK_WORKSPACE_DIRS.previews]: {},
        [MOCK_WORKSPACE_DIRS.projects]: {
          [projectAppConfig.folderName]: {
            "image.png": mockFs.load(
              path.resolve(
                import.meta.dirname,
                "../../fixtures/assets/image.png",
              ),
            ),
            "package.json": "{}",
            "test.txt": "Hello, world!",
          },
        },
        [MOCK_WORKSPACE_DIRS.templates]: {
          basic: {
            "file-from-basic.txt": "from basic",
            "package.json": "{}",
          },
        },
      });
    });

    it("should read and write a file", async () => {
      const actor = createTestActor({
        chunkSets: [readFileChunks, writeFileChunks, finishChunks],
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(
        `
        "<session title="Test session" count="6">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <tool tool="write_file" state="output-available" callId="test-call-2">
              <input>
                {
                  "filePath": "test.txt",
                  "content": "console.log('Hello, world!');"
                }
              </input>
              <output>
                {
                  "content": "console.log('Hello, world!');",
                  "filePath": "./test.txt",
                  "isNewFile": false
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="3" />
            <text state="done">I'm done.</text>
            <data-gitCommit ref="rev-parse HEAD executed successfully in /tmp/workspace/projects/pj-test" />
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `,
      );
    });

    it("should read an image file", async () => {
      const actor = createTestActor({
        chunkSets: [
          [
            {
              id: "test-call-image",
              toolName: "read_file",
              type: "tool-input-start",
            },
            {
              input: JSON.stringify({
                filePath: "image.png",
              }),
              toolCallId: "test-call-image",
              toolName: "read_file",
              type: "tool-call",
            },
          ],
          finishChunks,
        ],
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="5">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-available" callId="test-call-image">
              <input>
                {
                  "filePath": "image.png"
                }
              </input>
              <output>
                {
                  "base64Data": "iVBORw0KGgoAAAANSUhEUgAAAGQAAABLAQMAAAC81rD0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABlBMVEUAAP7////DYP5JAAAAAWJLR0QB/wIt3gAAAAlwSFlzAAALEgAACxIB0t1+/AAAAAd0SU1FB+QIGBcKN7/nP/UAAAASSURBVDjLY2AYBaNgFIwCdAAABBoAAaNglfsAAAAZdEVYdGNvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVDnr0DLAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIwLTA4LTI0VDIzOjEwOjU1KzAzOjAwkHdeuQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMC0wOC0yNFQyMzoxMDo1NSswMzowMOEq5gUAAAAASUVORK5CYII=",
                  "filePath": "./image.png",
                  "mimeType": "image/png",
                  "state": "image"
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    it("should handle multiple actors running in parallel", async () => {
      const actor1 = createTestActor({
        chunkSets: [
          [
            { id: "1", type: "text-start" },
            { delta: "First session", id: "1", type: "text-delta" },
            { id: "1", type: "text-end" },
            { finishReason: "stop", type: "finish", usage: mockUsage },
          ],
        ],
        sessionId: defaultSessionId,
      });

      const secondSessionId = StoreId.newSessionId();
      await Store.saveSession(
        {
          createdAt: mockDate,
          id: secondSessionId,
          title: "Second session",
        },
        projectAppConfig,
      );
      const secondMessageId = StoreId.newMessageId();
      const actor2 = createTestActor({
        chunkSets: [
          [
            { id: "1", type: "text-start" },
            { delta: "Second assistant message", id: "1", type: "text-delta" },
            { id: "1", type: "text-end" },
            { finishReason: "stop", type: "finish", usage: mockUsage },
          ],
        ],
        queuedMessages: [
          {
            id: secondMessageId,
            metadata: {
              createdAt: mockDate,
              sessionId: secondSessionId,
            },
            parts: [
              {
                metadata: {
                  createdAt: mockDate,
                  id: StoreId.newPartId(),
                  messageId: secondMessageId,
                  sessionId: secondSessionId,
                },
                text: "Second user message",
                type: "text",
              },
            ],
            role: "user",
          },
        ],
        sessionId: secondSessionId,
      });

      actor1.start();
      actor2.start();
      await waitFor(actor1, (state) => state.status === "done");
      await waitFor(actor2, (state) => state.status === "done");

      const sessionResult = await Store.getSessionWithMessagesAndParts(
        defaultSessionId,
        projectAppConfig,
      );
      expect(sessionToShorthand(sessionResult)).toMatchInlineSnapshot(`
        "<session title="Test session" count="4">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <text state="done">First session</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);

      const sessionResult2 = await Store.getSessionWithMessagesAndParts(
        secondSessionId,
        projectAppConfig,
      );
      expect(sessionToShorthand(sessionResult2)).toMatchInlineSnapshot(
        `
        "<session title="Second session" count="4">
          <user>
            <text>Second user message</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <text state="done">Second assistant message</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `,
      );
    });

    it("retry with invalid tool name", async () => {
      const actor = createTestActor({
        chunkSets: [
          [
            readFileChunks[0],
            {
              ...readFileChunks[1],
              toolName: "invalid_tool_name",
            },
          ],
          readFileChunks,
          finishChunks,
        ],
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="6">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-error" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <error>Model tried to call unavailable tool 'invalid_tool_name'. Available tools: edit_file, glob, grep, read_file, run_diagnostics, run_shell_command, write_file.</error>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="3" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    it("retry with invalid tool params", async () => {
      const actor = createTestActor({
        chunkSets: [
          [
            readFileChunks[0],
            {
              ...readFileChunks[1],
              input: JSON.stringify({
                filePath: "invalid/path/structure",
              }),
              toolCallId: "test-call-1",
            },
          ],
          readFileChunks,
          finishChunks,
        ],
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="6">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "invalid/path/structure"
                }
              </input>
              <output>
                {
                  "filePath": "./invalid/path/structure",
                  "state": "does-not-exist",
                  "suggestions": []
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="3" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    it("should stop after two steps with file read success", async () => {
      const neverMessage = "NEVER";
      const actor = createTestActor({
        chunkSets: [
          readFileChunks,
          readFileChunks,
          finishChunks,
          [
            { id: "1", type: "text-start" },
            { delta: neverMessage, id: "1", type: "text-delta" },
            { id: "1", type: "text-end" },
            { finishReason: "stop", type: "finish", usage: mockUsage },
          ],
        ],
      });

      actor.start();
      await waitFor(actor, (state) => state.status === "done");

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).not.toContain(neverMessage);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="6">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="3" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    it("should immediately exit when no tools are called", async () => {
      const actor = createTestActor({
        chunkSets: [finishChunks],
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="4">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    it("should stop agents during llm request", async () => {
      const actor = createTestActor({
        chunkSets: [finishChunks],
      });
      actor.start();
      await waitFor(actor, (state) =>
        state.matches({ Agent: "UsingReadOnlyTools" }),
      );
      actor.send({ type: "stop" });
      await waitFor(actor, (state) => state.status === "done");

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="1">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
        </session>"
      `);
    });

    it("should handle interactive tool calls with choose tool", async () => {
      const actor = createTestActor({
        agent: setupAgent({
          agentTools: pick(TOOLS, ["Choose"]),
          name: "main",
        }).create(() => ({
          getMessages: mainAgent.getMessages,
          onFinish: mainAgent.onFinish,
          onStart: mainAgent.onStart,
          shouldContinue: mainAgent.shouldContinue,
        })),
        chunkSets: [chooseChunks, finishChunks],
      });

      actor.start();

      // Wait for the agent to reach the WaitingForPendingToolCalls state
      await waitFor(actor, (state) =>
        state.matches({ Agent: { UsingReadOnlyTools: "Paused" } }),
      );

      // Send the tool call update to simulate user selection
      actor.send({
        type: "updateInteractiveToolCall",
        value: {
          toolCallId: chooseToolCallId,
          type: "success",
          value: {
            output: { selectedChoice: "Continue" },
            toolName: "choose",
          },
        },
      });

      // Wait for the actor to complete
      await waitFor(actor, (state) => state.status === "done");

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="5">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="choose" state="output-available" callId="test-call-choose">
              <input>
                {
                  "choices": [
                    "Continue",
                    "Stop",
                    "Restart"
                  ],
                  "question": "What would you like to do next?"
                }
              </input>
              <output>
                {
                  "selectedChoice": "Continue"
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    it("should retry and fail on timeout", async () => {
      const actor = createTestActor({
        baseLLMRetryDelayMs: 0,
        chunkSets: [
          readFileChunks,
          readFileChunks,
          readFileChunks,
          finishChunks,
        ],
        initialChunkDelaysMs: [200, 200, 1, 1],
        llmRequestChunkTimeoutMs: 100,
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="7">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="aborted" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
          </assistant>
          <assistant finishReason="aborted" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    it("should extend timeout when chunks are received", async () => {
      const chunkTimeoutMs = 50;

      const actor = createTestActor({
        baseLLMRetryDelayMs: 0,
        chunkDelayInMs: [
          chunkTimeoutMs * 1.5,
          chunkTimeoutMs * 0.1,
          chunkTimeoutMs * 0.1,
        ],
        chunkSets: [readFileChunks, readFileChunks, finishChunks],
        llmRequestChunkTimeoutMs: chunkTimeoutMs,
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="6">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="aborted" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="input-streaming" callId="test-call-1"></tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <text state="done">I'm done.</text>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
        </session>"
      `);
    });

    describe("with write file delay", () => {
      beforeEach(() => {
        vi.spyOn(TOOLS.WriteFile, "execute").mockImplementation(async () => {
          // Forces the function to be async which will hit WaitingForToolCallExecutions
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return ok({
            content: "console.log('Hello, world!');",
            filePath: "test.js" as RelativePath,
            isNewFile: false,
          });
        });
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it("should stop agents during execution", async () => {
        const actor = createTestActor({
          chunkSets: [readFileChunks, writeFileChunks, finishChunks],
        });
        actor.start();

        await waitFor(
          actor,
          (state) =>
            state.matches({ Agent: "UsingReadOnlyTools" }) &&
            state.context.agentRef?.getSnapshot().context.agent.name === "main",
        ).then(async () => {
          const agentRef = actor.getSnapshot().context.agentRef;
          if (!agentRef) {
            return;
          }
          await waitFor(agentRef, (state) =>
            state.matches("ExecutingToolCall"),
          );
        });

        actor.send({ type: "stop" });
        await waitFor(actor, (state) => state.status === "done");

        const session = await runTestMachine(actor);
        expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
          "<session title="Test session" count="4">
            <user>
              <text>Hello, I need help with something.</text>
            </user>
            <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
              <step-start step="1" />
              <tool tool="read_file" state="input-available" callId="test-call-1">
                <input>
                  {
                    "filePath": "test.txt"
                  }
                </input>
              </tool>
            </assistant>
            <session-context main realRole="system" />
            <session-context main realRole="user" />
          </session>"
        `);
      });
    });

    it("should enforce max step count when set to 2", async () => {
      const actor = createTestActor({
        chunkSets: [
          readFileChunks,
          readFileChunks,
          readFileChunks,
          finishChunks,
        ],
        maxStepCount: 2,
      });

      const session = await runTestMachine(actor);
      expect(sessionToShorthand(session)).toMatchInlineSnapshot(`
        "<session title="Test session" count="6">
          <user>
            <text>Hello, I need help with something.</text>
          </user>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="1" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <assistant finishReason="stop" tokens="0" model="mock-model-id" provider="mock-provider">
            <step-start step="2" />
            <tool tool="read_file" state="output-available" callId="test-call-1">
              <input>
                {
                  "filePath": "test.txt"
                }
              </input>
              <output>
                {
                  "content": "Hello, world!",
                  "displayedLines": 1,
                  "filePath": "./test.txt",
                  "hasMoreLines": false,
                  "offset": 0,
                  "state": "exists",
                  "totalLines": 1
                }
              </output>
            </tool>
          </assistant>
          <session-context main realRole="system" />
          <session-context main realRole="user" />
          <assistant finishReason="max-steps" model="quests-synthetic" provider="system">
            <text>Agent stopped due to maximum steps (2).</text>
          </assistant>
        </session>"
      `);
    });
  });
});
