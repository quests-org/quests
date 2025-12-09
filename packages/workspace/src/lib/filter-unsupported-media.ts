import type { AIGatewayModel } from "@quests/ai-gateway";
import type { ModelMessage, TextPart } from "ai";

interface ContentPart {
  mediaType?: string;
  type: string;
}

export function filterUnsupportedMedia({
  messages,
  model,
}: {
  messages: ModelMessage[];
  model: AIGatewayModel.Type;
}): ModelMessage[] {
  const features = model.features;

  const mediaFeatureMap: Record<
    "audio" | "file" | "image" | "video",
    AIGatewayModel.ModelFeatures
  > = {
    audio: "inputAudio",
    file: "inputFile",
    image: "inputImage",
    video: "inputVideo",
  };

  function filterPart<T extends ContentPart>(part: T): T | TextPart {
    if (
      typeof part === "object" &&
      "type" in part &&
      part.type === "file" &&
      "mediaType" in part &&
      typeof part.mediaType === "string"
    ) {
      const mediaCategory = getMediaTypeCategory(part.mediaType);

      if (
        mediaCategory !== "other" &&
        !features.includes(mediaFeatureMap[mediaCategory])
      ) {
        return createReplacementTextPart(mediaCategory);
      }
    }

    return part;
  }

  return messages.map((message) => {
    if (message.role === "user" && Array.isArray(message.content)) {
      message.content = message.content.map(filterPart);
    }

    if (message.role === "assistant" && Array.isArray(message.content)) {
      message.content = message.content.map(filterPart);
    }

    if (message.role === "tool" && Array.isArray(message.content)) {
      message.content = message.content.map((part) => {
        if (
          typeof part === "object" &&
          "output" in part &&
          typeof part.output === "object" &&
          "parts" in part.output &&
          Array.isArray(part.output.parts)
        ) {
          part.output.parts = part.output.parts.map(filterPart);
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

function createReplacementTextPart(
  mediaCategory: "audio" | "file" | "image" | "video",
): TextPart {
  const mediaTypeLabel = MEDIA_LABELS[mediaCategory];
  return {
    text: [
      `[System note: ${mediaTypeLabel} file removed - your model lacks ${mediaCategory} input capability.`,
      `Convert it to a different format or request the user to provide it in a different format if you need to access it.]`,
    ].join(" "),
    type: "text",
  };
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
