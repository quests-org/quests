import { type SessionMessage } from "../schemas/session/message";

export function textForMessage(
  message: SessionMessage.WithParts,
  options?: { includeFileNames?: boolean },
) {
  const includeFileNames = options?.includeFileNames ?? false;

  const textParts = message.parts
    .flatMap((part) => {
      switch (part.type) {
        case "text": {
          return [part.text];
        }
        default: {
          return [];
        }
      }
    })
    .join("\n");

  if (!includeFileNames) {
    return textParts;
  }

  const fileAttachmentsPart = message.parts.find(
    (part) => part.type === "data-fileAttachments",
  );

  if (!fileAttachmentsPart) {
    return textParts;
  }

  const fileNames = fileAttachmentsPart.data.files
    .map((file) => file.filePath)
    .join(", ");

  if (!fileNames) {
    return textParts;
  }

  return `${textParts}\n\nFiles attached by user: ${fileNames}`;
}
