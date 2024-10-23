import { z } from "zod";

// A schema that is compatible with AI SDK for validation during persistence
// and outbound API calls.
export namespace SessionMessageRelaxedPart {
  const ProviderMetadataSchema = z.record(
    z.string(),
    z.record(z.string(), z.json()),
  );

  const MetadataSchema = z.unknown();

  const TextPartSchema = z.object({
    metadata: MetadataSchema,
    providerMetadata: ProviderMetadataSchema.optional(),
    state: z.string().optional(),
    text: z.string(),
    type: z.literal("text"),
  });

  export type TextPart = z.output<typeof TextPartSchema>;

  const ReasoningPartSchema = z.object({
    metadata: MetadataSchema,
    providerMetadata: ProviderMetadataSchema.optional(),
    state: z.string().optional(),
    text: z.string(),
    type: z.literal("reasoning"),
  });

  export type ReasoningPart = z.output<typeof ReasoningPartSchema>;

  const SourceUrlPartSchema = z.object({
    metadata: MetadataSchema,
    providerMetadata: ProviderMetadataSchema.optional(),
    sourceId: z.string(),
    title: z.string().optional(),
    type: z.literal("source-url"),
    url: z.string(),
  });

  const SourceDocumentPartSchema = z.object({
    filename: z.string().optional(),
    mediaType: z.string(),
    metadata: MetadataSchema,
    providerMetadata: ProviderMetadataSchema.optional(),
    sourceId: z.string(),
    title: z.string(),
    type: z.literal("source-document"),
  });

  const FilePartSchema = z.object({
    filename: z.string().optional(),
    mediaType: z.string(),
    metadata: MetadataSchema,
    providerMetadata: ProviderMetadataSchema.optional(),
    type: z.literal("file"),
    url: z.string(),
  });

  const StepStartPartSchema = z.object({
    metadata: MetadataSchema,
    type: z.literal("step-start"),
  });

  const DataPartSchema = z.object({
    data: z.unknown(),
    id: z.string().optional(),
    metadata: MetadataSchema,
    type: z.string().startsWith("data-"),
  });

  export type DataPart = z.output<typeof DataPartSchema>;

  const ToolPartSchema = z.object({
    callProviderMetadata: ProviderMetadataSchema.optional(),
    errorText: z.string().optional(),
    input: z.unknown().optional(),
    metadata: MetadataSchema,
    output: z.unknown().optional(),
    providerExecuted: z.boolean().optional(),
    rawInput: z.unknown().optional(),
    state: z.string(),
    toolCallId: z.string(),
    type: z.custom<`tool-${string}`>(
      (v) => typeof v === "string" && v.startsWith("tool-"),
    ),
  });

  export type ToolPart = z.output<typeof ToolPartSchema>;

  export const Schema = z.union([
    DataPartSchema,
    FilePartSchema,
    ReasoningPartSchema,
    SourceDocumentPartSchema,
    SourceUrlPartSchema,
    StepStartPartSchema,
    TextPartSchema,
    ToolPartSchema,
  ]);
  export type Type = z.output<typeof Schema>;
}
