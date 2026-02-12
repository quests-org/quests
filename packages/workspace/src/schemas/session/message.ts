import { AIGatewayModel } from "@quests/ai-gateway";
import { type SyntheticModelId } from "@quests/shared";
import {
  convertToModelMessages,
  type ModelMessage,
  type ToolSet,
  type UIMessage,
} from "ai";
import { dedent } from "radashi";
import { z } from "zod";

import { type AgentName, RETRIEVAL_AGENT_NAME } from "../../agents/types";
import { formatBytes } from "../../lib/format-bytes";
import { isToolPart } from "../../lib/is-tool-part";
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
  const OptionalNumberOrNaNSchema = z.union([z.number(), z.nan()]).optional();

  // AI SDK v5 usage schema
  const LegacyUsageSchema = z.object({
    cachedInputTokens: z.union([z.number(), z.nan()]),
    inputTokens: z.union([z.number(), z.nan()]),
    outputTokens: z.union([z.number(), z.nan()]),
    reasoningTokens: z.union([z.number(), z.nan()]),
    totalTokens: z.union([z.number(), z.nan()]),
  });

  // AI SDK v6 usage schema
  const NewUsageSchema = z.object({
    inputTokenDetails: z.object({
      cacheReadTokens: OptionalNumberOrNaNSchema,
      cacheWriteTokens: OptionalNumberOrNaNSchema,
      noCacheTokens: OptionalNumberOrNaNSchema,
    }),
    inputTokens: OptionalNumberOrNaNSchema,
    outputTokenDetails: z.object({
      reasoningTokens: OptionalNumberOrNaNSchema,
      textTokens: OptionalNumberOrNaNSchema,
    }),
    outputTokens: OptionalNumberOrNaNSchema,
    totalTokens: OptionalNumberOrNaNSchema,
  });

  export const UsageSchema = z
    .union([LegacyUsageSchema, NewUsageSchema])
    .transform((value) => {
      // Check if it's the legacy format by checking for cachedInputTokens
      if ("cachedInputTokens" in value) {
        // Transform legacy format to new format
        return {
          inputTokenDetails: {
            cacheReadTokens: value.cachedInputTokens,
            cacheWriteTokens: undefined,
            noCacheTokens: undefined,
          },
          inputTokens: value.inputTokens,
          outputTokenDetails: {
            reasoningTokens: value.reasoningTokens,
            textTokens: undefined,
          },
          outputTokens: value.outputTokens,
          totalTokens: value.totalTokens,
        };
      }
      // Already in new format
      return value;
    });
  export type Usage = z.output<typeof UsageSchema>;

  // --------
  // Metadata
  // --------
  const BaseMetadataSchema = z.object({
    createdAt: z.date(),
    sessionId: StoreId.SessionSchema,
  });
  const ContextMetadataSchema = BaseMetadataSchema.extend({
    agentName: z
      .custom<AgentName>()
      // Migrate legacy "code" agent name
      .transform((value) => ((value as string) === "code" ? "main" : value)),
    realRole: z.enum(["system", "user", "assistant"]),
  });
  const SystemMetadataSchema = BaseMetadataSchema;
  const UserMetadataSchema = BaseMetadataSchema;
  const AssistantMetadataSchema = BaseMetadataSchema.extend({
    aiGatewayModel: AIGatewayModel.Schema.optional(),
    completionTokensPerSecond: z.number().optional(),
    endedAt: z.date().optional(),
    error: ErrorSchema.optional(),
    finishedAt: z.date().optional(),
    finishReason: z
      .enum([
        "aborted", // request was aborted
        "stop", // model generated stop sequence
        "length", // model generated maximum number of tokens
        "content-filter", // content filter violation stopped the model
        "tool-calls", // model triggered tool calls
        "error", // model stopped because of an error
        "other", // model stopped for other reasons
        "unknown", // model stopped for other reasons
        "max-steps", // stopped because of max steps
      ])
      // AI SDK v6 still returns undefined sometimes, e.g. with the Vercel Gateway provider
      // eslint-disable-next-line unicorn/prefer-top-level-await
      .catch("unknown"),
    modelId: z.custom<(string & {}) | SyntheticModelId>(
      // Custom string type to allow for TypeScript auto-completion
      (v) => typeof v === "string",
    ),
    msToFinish: z.number().optional(),
    msToFirstChunk: z.number().optional(),
    providerId: z.string(),
    synthetic: z.boolean().optional(), // When created by the workspace
    // eslint-disable-next-line unicorn/prefer-top-level-await
    usage: UsageSchema.optional().catch(undefined),
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
  export type AssistantWithParts = z.output<typeof AssistantSchemaWithParts>;

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

  export const ContextSchema = z.object({
    id: StoreId.MessageSchema,
    metadata: ContextMetadataSchema,
    role: z.literal("session-context"),
  });
  export type Context = z.output<typeof ContextSchema>;
  export const ContextSchemaWithParts = ContextSchema.extend({
    parts: z.array(SessionMessagePart.CoercedSchema),
  });
  export type ContextWithParts = z.output<typeof ContextSchemaWithParts>;

  // -----
  // Union
  // -----
  export const Schema = z.discriminatedUnion("role", [
    UserSchema,
    SystemSchema,
    AssistantSchema,
    ContextSchema,
  ]);

  export const WithPartsSchema = z.discriminatedUnion("role", [
    UserSchemaWithParts,
    SystemSchemaWithParts,
    AssistantSchemaWithParts,
    ContextSchemaWithParts,
  ]);

  export type Type = z.output<typeof Schema>;

  export type WithParts = Type & {
    parts: SessionMessagePart.Type[];
  };

  export async function toModelMessages(
    messages: WithParts[],
    tools: ToolSet,
  ): Promise<ModelMessage[]> {
    const uiMessages: UIMessage[] = messages.map((message) => {
      const filteredParts = message.parts
        .filter(
          (part) =>
            // Must filter or the AI SDK will throw an error in toModelMessages
            !isToolPart(part) ||
            // If the state is input-*, AI SDK errors in converting to model messages
            part.state === "output-available" ||
            part.state === "output-error",
        )
        .map(SessionMessagePart.toUIPart);

      const parts = [...filteredParts];

      if (message.role === "user") {
        const fileAttachmentsPart = message.parts.find(
          (part) => part.type === "data-fileAttachments",
        );

        if (fileAttachmentsPart) {
          const attachmentDescriptions = fileAttachmentsPart.data.files
            .map((file) => {
              const formattedSize = formatBytes(file.size);
              return `- ${file.filePath} (${formattedSize})`;
            })
            .join("\n");

          const attachmentText = dedent`
            <uploaded_files>
            The user attached these files to this message. Assume they are directly relevant to the user's request.
            ${attachmentDescriptions}
            </uploaded_files>
          `;

          parts.push({ text: attachmentText, type: "text" });

          if (
            fileAttachmentsPart.data.folders &&
            fileAttachmentsPart.data.folders.length > 0
          ) {
            const folderDescriptions = fileAttachmentsPart.data.folders
              .map((folder) => `- ${folder.name}`)
              .join("\n");

            const folderAttachmentText = dedent`
              <attached_folders>
              The user attached these folders to this message. Assume they are directly relevant to the user's request.
              ${folderDescriptions}
              
              These folders are outside the current project. The ${RETRIEVAL_AGENT_NAME} agent will receive their absolute paths and can search, read, and copy files from them into the project for you access or modify.
              </attached_folders>
            `;

            parts.push({ text: folderAttachmentText, type: "text" });
          }
        }
      }

      return {
        ...message,
        parts,
        role:
          message.role === "session-context"
            ? message.metadata.realRole
            : message.role,
      };
    });
    return convertToModelMessages(uiMessages, { tools });
  }
}
