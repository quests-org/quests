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
    (part) => part.type === "data-attachments",
  );

  if (!fileAttachmentsPart) {
    return textParts;
  }

  const fileNames = fileAttachmentsPart.data.files
    .map((file) => file.filePath)
    .join(", ");

  const folderNames = (fileAttachmentsPart.data.folders ?? [])
    .map((folder) => folder.name)
    .join(", ");

  if (!fileNames && !folderNames) {
    return textParts;
  }

  const parts = [textParts];
  if (fileNames) {
    parts.push(`Files attached by user: ${fileNames}`);
  }
  if (folderNames) {
    parts.push(`Folders attached by user: ${folderNames}`);
  }

  return parts.join("\n\n");
}
