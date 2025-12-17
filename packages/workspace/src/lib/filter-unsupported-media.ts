import type { AIGatewayModel } from "@quests/ai-gateway";
import type { ModelMessage } from "ai";

import { dedent } from "radashi";

type MediaCategory = "audio" | "file" | "image" | "video";

export function filterUnsupportedMedia({
  messages,
  model,
}: {
  messages: ModelMessage[];
  model: AIGatewayModel.Type;
}): ModelMessage[] {
  return messages.map((message) => {
    if (message.role === "user" && Array.isArray(message.content)) {
      message.content = message.content.map((part) => {
        if (
          typeof part === "object" &&
          "type" in part &&
          part.type === "file" &&
          "mediaType" in part &&
          typeof part.mediaType === "string"
        ) {
          const replacementText = maybeCreateReplacementText(
            part.mediaType,
            model,
          );
          if (replacementText) {
            return { text: replacementText, type: "text" };
          }
        }
        return part;
      });
    }

    if (message.role === "assistant" && Array.isArray(message.content)) {
      message.content = message.content.map((part) => {
        if (
          typeof part === "object" &&
          "type" in part &&
          part.type === "file" &&
          "mediaType" in part &&
          typeof part.mediaType === "string"
        ) {
          const replacementText = maybeCreateReplacementText(
            part.mediaType,
            model,
          );
          if (replacementText) {
            return { text: replacementText, type: "text" };
          }
        }
        return part;
      });
    }

    if (message.role === "tool" && Array.isArray(message.content)) {
      message.content = message.content.map((part) => {
        if (
          typeof part === "object" &&
          "output" in part &&
          typeof part.output === "object" &&
          "type" in part.output &&
          part.output.type === "content" &&
          "value" in part.output &&
          Array.isArray(part.output.value)
        ) {
          part.output.value = part.output.value.map((valuePart) => {
            if (
              valuePart.type === "media" &&
              "mediaType" in valuePart &&
              typeof valuePart.mediaType === "string"
            ) {
              const replacementText = maybeCreateReplacementText(
                valuePart.mediaType,
                model,
              );
              if (replacementText) {
                return { text: replacementText, type: "text" as const };
              }
            }

            return valuePart;
          });
        }

        return part;
      });
    }

    return message;
  });
}

const MEDIA_LABELS: Record<"audio" | "file" | "image" | "video", string> = {
  audio: "Audio",
  file: "File",
  image: "Image",
  video: "Video",
};

const MEDIA_FEATURE_MAP: Record<MediaCategory, AIGatewayModel.ModelFeatures> = {
  audio: "inputAudio",
  file: "inputFile",
  image: "inputImage",
  video: "inputVideo",
};

function createReplacementTextForCategory(
  mediaCategory: MediaCategory,
  isOpenAIViaOpenRouter: boolean,
): string {
  const mediaTypeLabel = MEDIA_LABELS[mediaCategory];
  const alternativeInstruction =
    "Convert it to a different format or request the user to provide it in a different format if you need to access it.";

  if (isOpenAIViaOpenRouter) {
    return dedent`
      <system_note>
      ${mediaTypeLabel} file removed - OpenAI models via OpenRouter are currently causing errors with ${mediaCategory} inputs.
      The model has the capability to read these files, but this provider combination is experiencing technical issues.
      ${alternativeInstruction}
      </system_note>
    `;
  }

  return dedent`
    <system_note>
    ${mediaTypeLabel} file removed - your model lacks ${mediaCategory} input capability.
    ${alternativeInstruction}
    </system_note>
  `;
}

function getMediaTypeCategory(mediaType: string) {
  if (mediaType.startsWith("audio/")) {
    return "audio";
  }
  if (mediaType.startsWith("image/")) {
    return "image";
  }
  if (mediaType.startsWith("video/")) {
    return "video";
  }
  if (mediaType === "application/pdf") {
    return "file";
  }
  return "other";
}

function maybeCreateReplacementText(
  mediaType: string,
  model: AIGatewayModel.Type,
): null | string {
  const mediaCategory = getMediaTypeCategory(mediaType);

  if (mediaCategory === "other") {
    return null;
  }

  const isOpenAIModelViaOpenRouter =
    model.author.toLowerCase() === "openai" &&
    (model.params.provider === "openrouter" ||
      model.params.provider === "quests");

  if (isOpenAIModelViaOpenRouter && mediaType === "application/pdf") {
    return createReplacementTextForCategory(mediaCategory, true);
  }

  if (!model.features.includes(MEDIA_FEATURE_MAP[mediaCategory])) {
    return createReplacementTextForCategory(mediaCategory, false);
  }

  return null;
}
