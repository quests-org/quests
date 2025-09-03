import { convertToModelMessages, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";

import { StoreId } from "../store-id";
import { SessionMessagePart } from "./message-part";

export namespace SessionMessage {
  // -----
  // Error
  // -----
  const ErrorSchema = z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("api-key"),
      message: z.string(),
    }),
    z.object({
      kind: z.literal("aborted"),
      message: z.string(),
    }),
    z.object({
      kind: z.literal("unknown"),
      message: z.string(),
    }),
    z.object({
      kind: z.literal("api-call"),
      message: z.string(),
      name: z.string(),
      responseBody: z.string().optional(),
      statusCode: z.number().optional(),
      url: z.string(),
    }),
    z.object({
      input: z.string(),
      kind: z.literal("invalid-tool-input"),
      message: z.string(),
    }),
    z.object({
      kind: z.literal("no-such-tool"),
      message: z.string(),
      toolName: z.string(),
    }),
  ]);

  // -----
  // Usage
  // -----
  export const UsageSchema = z.object({
    cachedInputTokens: z.union([z.number(), z.nan()]),
    inputTokens: z.union([z.number(), z.nan()]),
    outputTokens: z.union([z.number(), z.nan()]),
    reasoningTokens: z.union([z.number(), z.nan()]),
    totalTokens: z.union([z.number(), z.nan()]),
  });
  export type Usage = z.output<typeof UsageSchema>;

  // --------
  // Metadata
  // --------
  const BaseMetadataSchema = z.object({
    createdAt: z.date(),
    sessionId: StoreId.SessionSchema,
  });
  const SystemMetadataSchema = BaseMetadataSchema;
  const UserMetadataSchema = BaseMetadataSchema;
  const AssistantMetadataSchema = BaseMetadataSchema.extend({
    completionTokensPerSecond: z.number().optional(),
    endedAt: z.date().optional(),
    error: ErrorSchema.optional(),
    finishedAt: z.date().optional(),
    finishReason: z.enum([
      "aborted", // request was aborted
      "stop", // model generated stop sequence
      "length", // model generated maximum number of tokens
      "content-filter", // content filter violation stopped the model
      "tool-calls", // model triggered tool calls
      "error", // model stopped because of an error
      "other", // model stopped for other reasons
      "unknown", // model stopped for other reasons
      "max-steps", // stopped because of max steps
    ]),
    isSummary: z.boolean().optional(),
    modelId: z.custom<"quests-synthetic" | (string & {})>(
      // Custom string type to allow for TypeScript auto-completion
      (v) => typeof v === "string",
    ),
    msToFinish: z.number().optional(),
    msToFirstChunk: z.number().optional(),
    synthetic: z.boolean().optional(), // When created by the workspace
    // Default just for compatibility on 2025-08-08, will remove later
    providerId: z.string().default("unknown"),
    usage: UsageSchema.partial().optional(),
  });

  export const MetadataSchema = z.union([
    SystemMetadataSchema,
    UserMetadataSchema,
    AssistantMetadataSchema,
  ]);
  export type Metadata = z.output<typeof MetadataSchema>;

  // -------
  // Message
  // -------
  const SystemSchema = z.object({
    id: StoreId.MessageSchema,
    metadata: SystemMetadataSchema,
    role: z.literal("system"),
  });
  const SystemSchemaWithParts = SystemSchema.extend({
    parts: z.array(SessionMessagePart.CoercedSchema),
  });
  export type SystemWithParts = z.output<typeof SystemSchemaWithParts>;

  const AssistantSchema = z.object({
    id: StoreId.MessageSchema,
    metadata: AssistantMetadataSchema,
    role: z.literal("assistant"),
  });
  export type Assistant = z.output<typeof AssistantSchema>;
  const AssistantSchemaWithParts = AssistantSchema.extend({
    parts: z.array(SessionMessagePart.CoercedSchema),
  });

  export const UserSchema = z.object({
    id: StoreId.MessageSchema,
    metadata: UserMetadataSchema,
    role: z.literal("user"),
  });

  export type User = z.output<typeof UserSchema>;
  export const UserSchemaWithParts = UserSchema.extend({
    parts: z.array(SessionMessagePart.CoercedSchema),
  });
  export type UserWithParts = z.output<typeof UserSchemaWithParts>;

  // -----
  // Union
  // -----
  export const Schema = z.discriminatedUnion("role", [
    UserSchema,
    SystemSchema,
    AssistantSchema,
  ]);

  export const WithPartsSchema = z.discriminatedUnion("role", [
    UserSchemaWithParts,
    SystemSchemaWithParts,
    AssistantSchemaWithParts,
  ]);

  export type Type = z.output<typeof Schema>;

  export type WithParts = Type & {
    parts: SessionMessagePart.Type[];
  };

  export function toModelMessages(
    messages: WithParts[],
    tools: ToolSet,
  ): ModelMessage[] {
    const filteredMessages = messages.map((message) => ({
      ...message,
      parts: message.parts
        .filter(
          (part) =>
            // Must filter or the AI SDK will throw an error in toModelMessages
            !SessionMessagePart.isToolPart(part) ||
            // If the state is input-*, AI SDK errors in converting to model messages
            part.state === "output-available" ||
            part.state === "output-error",
        )
        .map(SessionMessagePart.toUIPart),
    }));
    return convertToModelMessages(filteredMessages, { tools });
  }
}
