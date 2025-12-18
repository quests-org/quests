import type { LanguageModelV2ToolResultOutput } from "@ai-sdk/provider";
import type { AIProviderType } from "@quests/shared";
import type { FilePart, ModelMessage } from "ai";

import mime from "mime";

type ContentOutput = Extract<
  LanguageModelV2ToolResultOutput,
  { type: "content" }
>;

type MediaPart = Extract<ContentOutput["value"][number], { type: "media" }>;

type ToolResultPart = Extract<
  ModelMessage["content"][number],
  { type: "tool-result" }
>;

const MULTIPART_TOOL_RESULT_PROVIDERS = new Set<AIProviderType>([
  "anthropic",
  "google",
  "openai",
]);

export function splitMultipartToolResults({
  messages,
  provider,
}: {
  messages: ModelMessage[];
  provider: AIProviderType;
}): ModelMessage[] {
  if (supportsMultipartToolResults(provider)) {
    return messages;
  }
  const result: ModelMessage[] = [];

  for (const message of messages) {
    if (message.role !== "tool" || !Array.isArray(message.content)) {
      result.push(message);
      continue;
    }

    const hasMultipartToolResult = message.content.some((part) => {
      const output = part.output;
      return isContentOutput(output) && hasMediaParts(output);
    });

    if (!hasMultipartToolResult) {
      result.push(message);
      continue;
    }

    const modifiedContent = message.content.map((part) => {
      if (isContentOutput(part.output)) {
        const textParts = extractTextParts(part.output);
        return convertToTextOutput(part, textParts);
      }
      return part;
    });

    result.push({
      ...message,
      content: modifiedContent,
    });

    const userMessageParts = message.content
      .filter((part) => isContentOutput(part.output))
      .flatMap((part) => {
        const output = part.output;
        if (!isContentOutput(output)) {
          return [];
        }
        return extractMediaParts(output);
      });

    if (userMessageParts.length > 0) {
      result.push({
        content: userMessageParts,
        role: "user",
      });
    }
  }

  return result;
}

function convertToTextOutput(
  part: ToolResultPart,
  textParts: { text: string; type: "text" }[],
) {
  if (textParts.length === 0) {
    return { ...part, output: { type: "text" as const, value: "" } };
  }

  const textValue = textParts.map((p) => p.text).join("\n");

  return {
    ...part,
    output: {
      type: "text" as const,
      value: textValue,
    },
  };
}

function extractMediaParts(output: ContentOutput): FilePart[] {
  return output.value
    .filter((item): item is MediaPart => item.type === "media")
    .map((item) => ({
      data: item.data,
      // OpenAI requires a filename for media parts or it will throw an error
      filename: generateFilenameFromMimeType(item.mediaType),
      mediaType: item.mediaType,
      type: "file" as const,
    }));
}

function extractTextParts(output: ContentOutput) {
  return output.value.filter((item) => item.type === "text");
}

function generateFilenameFromMimeType(mimeType: string): string {
  const extension = mime.getExtension(mimeType) ?? "unknown";
  return `placeholder.${extension}`;
}

function hasMediaParts(output: ContentOutput): boolean {
  return output.value.some((item) => item.type === "media");
}

function isContentOutput(output: unknown): output is ContentOutput {
  return (
    typeof output === "object" &&
    output !== null &&
    "type" in output &&
    output.type === "content" &&
    "value" in output &&
    Array.isArray(output.value)
  );
}

function supportsMultipartToolResults(provider: AIProviderType): boolean {
  return MULTIPART_TOOL_RESULT_PROVIDERS.has(provider);
}
