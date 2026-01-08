import type { ToolSet } from "ai";
import type { ActorRef, AnyMachineSnapshot } from "xstate";

import {
  type AIGatewayLanguageModel,
  providerOptionsForModel,
} from "@quests/ai-gateway";
import {
  APICallError,
  InvalidToolInputError,
  LoadAPIKeyError,
  NoSuchToolError,
  parsePartialJson,
  streamText,
} from "ai";
import { fromPromise } from "xstate";

import { type AnyAgent } from "../agents/types";
import { type AppConfig } from "../lib/app-config/types";
import { getCurrentDate } from "../lib/get-current-date";
import { isToolPart } from "../lib/is-tool-part";
import { prepareModelMessages } from "../lib/prepare-model-messages";
import { Store } from "../lib/store";
import { type SessionMessage } from "../schemas/session/message";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { StoreId } from "../schemas/store-id";
import { ToolNameSchema } from "../tools/name";

interface LLMRequestInput {
  agent: AnyAgent;
  appConfig: AppConfig;
  model: AIGatewayLanguageModel;
  self: ActorRef<AnyMachineSnapshot, { type: "llmRequest.chunkReceived" }>;
  sessionId: StoreId.Session;
  stepCount: number;
  toolChoice?: "auto" | "none" | "required";
}

export const llmRequestLogic = fromPromise<
  {
    message: SessionMessage.Assistant;
    parts: SessionMessagePart.Type[];
  },
  LLMRequestInput
>(async ({ input, signal }) => {
  const scopedStore = {
    saveMessage: (message: Parameters<typeof Store.saveMessage>[0]) =>
      Store.saveMessage(message, input.appConfig, { signal }).then((result) => {
        if (result.isErr()) {
          input.appConfig.workspaceConfig.captureException(result.error, {
            scopes: ["workspace", "llm-request"],
          });
          return;
        }
        return result.value;
      }),
    savePart: (part: Parameters<typeof Store.savePart>[0]) =>
      Store.savePart(part, input.appConfig, { signal }).then((result) => {
        if (result.isErr()) {
          input.appConfig.workspaceConfig.captureException(result.error, {
            scopes: ["workspace", "llm-request"],
          });
          return;
        }
        return result.value;
      }),
  };

  const captureEvent = input.appConfig.workspaceConfig.captureEvent;
  const providerId =
    typeof input.model === "string" ? "unknown" : input.model.provider;
  const modelId =
    typeof input.model === "string" ? input.model : input.model.modelId;
  const assistantMessage: SessionMessage.Assistant = {
    id: StoreId.newMessageId(),
    metadata: {
      aiGatewayModel: input.model.__aiGatewayModel,
      createdAt: getCurrentDate(),
      finishReason: "unknown",
      modelId,
      providerId,
      sessionId: input.sessionId,
    },
    role: "assistant",
  };

  function saveAbortMessage() {
    assistantMessage.metadata.error = {
      kind: "aborted",
      message: "Aborted",
    };
    assistantMessage.metadata.finishedAt = getCurrentDate();
    assistantMessage.metadata.finishReason = "aborted";
    void scopedStore.saveMessage(assistantMessage);
  }

  async function getCurrentParts() {
    const partsResult = await Store.getParts(
      input.sessionId,
      assistantMessage.id,
      input.appConfig,
      { signal },
    );
    if (partsResult.isErr()) {
      input.appConfig.workspaceConfig.captureException(partsResult.error, {
        scopes: ["workspace", "llm-request"],
      });
    }
    return partsResult.isOk() ? partsResult.value : [];
  }

  const agentTools = await input.agent.getTools();

  const tools: ToolSet = Object.fromEntries(
    agentTools.map((tool) => [tool.name as string, tool.aiSDKTool()]),
  );

  const messagesResult = await prepareModelMessages({
    agent: input.agent,
    appConfig: input.appConfig,
    model: input.model.__aiGatewayModel,
    sessionId: input.sessionId,
    signal,
  });

  if (messagesResult.isErr()) {
    throw new Error(
      `Error preparing model messages: ${JSON.stringify(messagesResult.error)}`,
    );
  }

  if (signal.aborted) {
    saveAbortMessage();
    return { message: assistantMessage, parts: await getCurrentParts() };
  }

  await scopedStore.saveMessage(assistantMessage);

  const abortListener = () => {
    saveAbortMessage();
  };

  signal.addEventListener("abort", abortListener);

  let currentTextPart: SessionMessagePart.TextPart | undefined;
  const reasoningMap: Record<string, SessionMessagePart.ReasoningPart> = {};
  let msToFirstChunk: number | undefined;
  let msToFinish: number | undefined;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (signal.aborted) {
    saveAbortMessage();
    return { message: assistantMessage, parts: await getCurrentParts() };
  }

  const toolCalls: Record<string, SessionMessagePart.ToolPart> = {};
  const toolCallInputText: Record<string, string> = {};
  try {
    const startTimestampMs = getCurrentDate().getTime();
    const result = streamText({
      abortSignal: signal,
      maxRetries: 0, // Handled outside this function
      messages: messagesResult.value,
      model: input.model,
      onError: () => {
        // These are thrown and handled by the catch block
        // no-op to avoid excessive logging
      },
      providerOptions: providerOptionsForModel(input.model),
      toolChoice: input.toolChoice,
      tools,
    });

    for await (const part of result.fullStream) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (signal.aborted || part.type === "abort") {
        // Ensures we don't try to process any more parts
        break;
      }
      input.self.send({ type: "llmRequest.chunkReceived" });
      switch (part.type) {
        case "error": {
          // This blows up the whole stream for any error, but it does not have
          // to. E.g. an invalid tool call could still contain other valid tool
          // calls.
          throw part.error;
        }
        case "finish": {
          msToFinish = getCurrentDate().getTime() - startTimestampMs;
          const completionTokensPerSecond =
            part.totalUsage.outputTokens && msToFinish > 0
              ? (part.totalUsage.outputTokens / msToFinish) * 1000
              : undefined;
          assistantMessage.metadata.usage = part.totalUsage;
          assistantMessage.metadata.finishedAt = getCurrentDate();
          assistantMessage.metadata.finishReason = part.finishReason;
          assistantMessage.metadata.msToFinish = msToFinish;
          assistantMessage.metadata.msToFirstChunk = msToFirstChunk;
          assistantMessage.metadata.completionTokensPerSecond =
            completionTokensPerSecond;
          await scopedStore.saveMessage(assistantMessage);
          captureEvent("llm.request_finished", {
            cached_input_tokens: part.totalUsage.cachedInputTokens,
            completion_tokens_per_second: completionTokensPerSecond,
            finish_reason: part.finishReason,
            input_tokens: part.totalUsage.inputTokens,
            modelId,
            ms_to_finish: msToFinish,
            ms_to_first_chunk: msToFirstChunk ?? 0,
            output_tokens: part.totalUsage.outputTokens,
            providerId,
            reasoning_tokens: part.totalUsage.reasoningTokens,
            step_count: input.stepCount,
            total_tokens: part.totalUsage.totalTokens,
          });
          break;
        }
        case "file": {
          // Not supported yet
          break;
        }
        case "finish-step": {
          // We only run one step, so this is covered by "finish"
          break;
        }
        case "raw": {
          throw new Error(`Unexpected raw part: ${JSON.stringify(part)}`);
        }
        case "reasoning-delta": {
          const reasoningPart = reasoningMap[part.id];
          if (reasoningPart) {
            reasoningPart.text += part.text;
            if (part.providerMetadata !== undefined) {
              reasoningPart.providerMetadata = part.providerMetadata;
            }
            if (reasoningPart.text) {
              await scopedStore.savePart(reasoningPart);
            }
          }
          break;
        }
        case "reasoning-end": {
          const reasoningPart = reasoningMap[part.id];
          if (reasoningPart) {
            const updatedPart: SessionMessagePart.ReasoningPart = {
              ...reasoningPart,
              metadata: {
                ...reasoningPart.metadata,
                endedAt: getCurrentDate(),
              },
              ...(part.providerMetadata !== undefined && {
                providerMetadata: part.providerMetadata,
              }),
              state: "done",
              text: reasoningPart.text.trimEnd(),
            };
            await scopedStore.savePart(updatedPart);
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete reasoningMap[part.id];
          }
          break;
        }
        case "reasoning-start": {
          if (part.id in reasoningMap) {
            continue;
          }
          const newReasoningPart: SessionMessagePart.ReasoningPart = {
            metadata: {
              createdAt: getCurrentDate(),
              id: StoreId.newPartId(),
              messageId: assistantMessage.id,
              sessionId: input.sessionId,
            },
            ...(part.providerMetadata !== undefined && {
              providerMetadata: part.providerMetadata,
            }),
            state: "streaming",
            text: "",
            type: "reasoning",
          };
          reasoningMap[part.id] = newReasoningPart;
          await scopedStore.savePart(newReasoningPart);
          break;
        }
        case "source": {
          // eslint-disable-next-line unicorn/prefer-ternary
          if (part.sourceType === "url") {
            await scopedStore.savePart({
              metadata: {
                createdAt: getCurrentDate(),
                id: StoreId.newPartId(),
                messageId: assistantMessage.id,
                sessionId: input.sessionId,
              },
              sourceId: part.id,
              title: part.title,
              type: "source-url",
              url: part.url,
            });
          } else {
            await scopedStore.savePart({
              filename: part.filename,
              mediaType: part.mediaType,
              metadata: {
                createdAt: getCurrentDate(),
                id: StoreId.newPartId(),
                messageId: assistantMessage.id,
                sessionId: input.sessionId,
              },
              sourceId: part.id,
              title: part.title,
              type: "source-document",
            });
          }
          break;
        }
        case "start": {
          await scopedStore.savePart({
            metadata: {
              createdAt: getCurrentDate(),
              id: StoreId.newPartId(),
              messageId: assistantMessage.id,
              sessionId: input.sessionId,
              stepCount: input.stepCount,
            },
            type: "step-start",
          });
          break;
        }

        case "start-step": {
          // We only run one step, so this is covered by "start"
          msToFirstChunk ??= getCurrentDate().getTime() - startTimestampMs;
          break;
        }
        case "text-delta": {
          if (currentTextPart) {
            currentTextPart.text += part.text;
            if (part.providerMetadata !== undefined) {
              currentTextPart.providerMetadata = part.providerMetadata;
            }
            if (currentTextPart.text) {
              await scopedStore.savePart(currentTextPart);
            }
          }
          break;
        }
        case "text-end": {
          if (currentTextPart && currentTextPart.text.length > 0) {
            const updatedPart: SessionMessagePart.TextPart = {
              ...currentTextPart,
              metadata: {
                ...currentTextPart.metadata,
                endedAt: getCurrentDate(),
              },
              ...(part.providerMetadata !== undefined && {
                providerMetadata: part.providerMetadata,
              }),
              state: "done",
              text: currentTextPart.text.trimEnd(),
            };
            await scopedStore.savePart(updatedPart);
          }
          currentTextPart = undefined;
          break;
        }
        case "text-start": {
          currentTextPart = {
            metadata: {
              createdAt: getCurrentDate(),
              id: StoreId.newPartId(),
              messageId: assistantMessage.id,
              sessionId: input.sessionId,
            },
            ...(part.providerMetadata !== undefined && {
              providerMetadata: part.providerMetadata,
            }),
            state: "streaming",
            text: "",
            type: "text",
          };
          break;
        }
        case "tool-call": {
          const existingPart = toolCalls[part.toolCallId];
          if (existingPart && existingPart.state === "input-streaming") {
            const updatedPart: SessionMessagePart.ToolPart = {
              ...existingPart,
              ...(part.providerMetadata !== undefined && {
                callProviderMetadata: part.providerMetadata,
              }),
              input: part.input,
              providerExecuted: part.providerExecuted,
              state: "input-available",
            };
            await scopedStore.savePart(updatedPart);
          } else {
            input.appConfig.workspaceConfig.captureException(
              new Error(`${existingPart ? "Unexpected" : "Missing"} tool call`),
              {
                existing_part_state: existingPart?.state,
                scopes: ["workspace", "llm-request"],
                tool_name: part.toolName,
              },
            );
          }
          captureEvent("llm.tool_called", {
            modelId,
            providerId,
            tool_name: part.toolName,
          });
          break;
        }
        case "tool-error": {
          // Still happens even without execute if parameters are invalid
          const toolCall = toolCalls[part.toolCallId];
          if (toolCall) {
            if (toolCall.state !== "input-streaming") {
              throw new Error(
                `Unexpected tool error for tool not in input-streaming state: ${JSON.stringify(part)}`,
              );
            }
            const updatedPart: SessionMessagePart.ToolPart = {
              ...toolCall,
              errorText:
                typeof part.error === "string"
                  ? part.error
                  : JSON.stringify(part.error),
              input: undefined as never, // Don't save input because it might be invalid JSON
              metadata: {
                ...toolCall.metadata,
                endedAt: getCurrentDate(),
              },
              ...(part.providerMetadata !== undefined && {
                callProviderMetadata: part.providerMetadata,
              }),
              providerExecuted: part.providerExecuted,
              rawInput: part.input as never,
              state: "output-error",
            };
            await scopedStore.savePart(updatedPart);
          } else {
            await scopedStore.savePart({
              ...(part.providerMetadata !== undefined && {
                callProviderMetadata: part.providerMetadata,
              }),
              errorText:
                typeof part.error === "string"
                  ? part.error
                  : JSON.stringify(part.error),
              input: part.input as never,
              metadata: {
                createdAt: getCurrentDate(),
                endedAt: getCurrentDate(),
                id: StoreId.newPartId(),
                messageId: assistantMessage.id,
                sessionId: input.sessionId,
              },
              rawInput: part.input as never,
              state: "output-error",
              toolCallId: part.toolCallId,
              type: "tool-unavailable",
            });
          }
          captureEvent("llm.error", {
            error_message:
              typeof part.error === "string"
                ? part.error
                : JSON.stringify(part.error),
            error_type: "tool-error",
            modelId,
            providerId,
            tool_name: part.toolName,
          });
          break;
        }
        case "tool-input-delta": {
          const toolCall = toolCalls[part.id];
          if (toolCall && toolCall.state === "input-streaming") {
            toolCallInputText[part.id] =
              (toolCallInputText[part.id] || "") + part.delta;
            const { value: partialArgs } = await parsePartialJson(
              toolCallInputText[part.id],
            );
            const updatedPart: SessionMessagePart.ToolPart = {
              ...toolCall,
              input: partialArgs as never,
            };
            toolCalls[part.id] = updatedPart;
            await scopedStore.savePart(updatedPart);
          }
          break;
        }
        case "tool-input-end": {
          // No deltas for now
          break;
        }
        case "tool-input-start": {
          const toolNameResult = ToolNameSchema.safeParse(part.toolName);
          const newPart: SessionMessagePart.ToolPart = {
            input: undefined,
            metadata: {
              createdAt: getCurrentDate(),
              id: StoreId.newPartId(),
              messageId: assistantMessage.id,
              sessionId: input.sessionId,
            },
            providerExecuted: part.providerExecuted,
            ...(part.providerMetadata !== undefined && {
              callProviderMetadata: part.providerMetadata,
            }),
            state: "input-streaming",
            toolCallId: StoreId.ToolCallSchema.parse(part.id),
            type: toolNameResult.success
              ? `tool-${toolNameResult.data}`
              : "tool-unavailable",
          };
          toolCalls[part.id] = newPart;
          await scopedStore.savePart(newPart);
          break;
        }
        case "tool-result": {
          throw new Error(`Unexpected tool result: ${JSON.stringify(part)}`);
        }
        default: {
          const _exhaustiveCheck: never = part;
          throw new Error(
            `Unexpected part: ${JSON.stringify(_exhaustiveCheck)}`,
          );
        }
      }
    }
  } catch (error) {
    switch (true) {
      case error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError"): {
        // Not sure if we hit this, I wasn't able to reproduce it
        assistantMessage.metadata.error = {
          kind: "aborted",
          message: error.message,
        };
        captureEvent("llm.error", {
          error_type: "aborted",
          modelId,
          providerId,
        });
        break;
      }
      case LoadAPIKeyError.isInstance(error): {
        // Pretty sure this is impossible, but opencode does it
        assistantMessage.metadata.error = {
          kind: "api-key",
          message: error.message,
        };
        captureEvent("llm.error", {
          error_type: "api-key",
          modelId,
          providerId,
        });
        break;
      }
      case APICallError.isInstance(error): {
        assistantMessage.metadata.error = {
          kind: "api-call",
          message: error.message,
          name: error.name,
          responseBody: error.responseBody,
          statusCode: error.statusCode,
          url: error.url,
        };
        captureEvent("llm.error", {
          error_type: "api-call",
          modelId,
          providerId,
        });
        break;
      }
      // Should not be called now that tool-error above handles this
      case InvalidToolInputError.isInstance(error): {
        assistantMessage.metadata.error = {
          input: error.toolInput,
          kind: "invalid-tool-input",
          message: error.message,
        };
        captureEvent("llm.error", {
          error_type: "invalid-tool-input",
          modelId,
          providerId,
        });
        break;
      }
      // Should not be called now that tool-error above handles this
      case NoSuchToolError.isInstance(error): {
        assistantMessage.metadata.error = {
          kind: "no-such-tool",
          message: error.message,
          toolName: error.toolName,
        };
        captureEvent("llm.error", {
          error_type: "no-such-tool",
          modelId,
          providerId,
          tool_name: error.toolName,
        });
        break;
      }
      default: {
        assistantMessage.metadata.error = {
          kind: "unknown",
          message:
            error instanceof Error ? error.message : JSON.stringify(error),
        };
        input.appConfig.workspaceConfig.captureException(error, {
          scopes: ["workspace", "llm-request"],
        });
      }
    }

    const parts = await getCurrentParts();
    for (const part of parts) {
      if (isToolPart(part) && part.state === "input-streaming") {
        // eslint-disable-next-line no-console
        console.error("Unhandled tool input streaming part", part);
      }
    }

    assistantMessage.metadata.finishedAt = getCurrentDate();
    await scopedStore.saveMessage(assistantMessage);
  }

  // Remove abort listener since we've completed
  signal.removeEventListener("abort", abortListener);

  return { message: assistantMessage, parts: await getCurrentParts() };
});
