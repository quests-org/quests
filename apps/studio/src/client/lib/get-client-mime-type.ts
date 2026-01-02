import { TEXT_EXTENSION_MIME_MAP } from "@quests/shared";

export function getClientMimeType({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType?: string;
}): string {
  if (mimeType && mimeType !== "application/octet-stream") {
    return mimeType;
  }

  const ext = getFileExtension(filename);
  if (ext) {
    const extWithDot = `.${ext}`;
    const mimeFromMap = TEXT_EXTENSION_MIME_MAP[extWithDot];
    if (mimeFromMap) {
      return mimeFromMap;
    }
  }

  return mimeType ?? "application/octet-stream";
}

function getFileExtension(filename: string): string {
  const lowerName = filename.toLowerCase();
  const lastDotIndex = lowerName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return "";
  }
  return lowerName.slice(lastDotIndex + 1);
}
