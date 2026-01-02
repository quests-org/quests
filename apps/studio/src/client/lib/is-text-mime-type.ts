import { TEXT_EXTENSION_MIME_MAP } from "@quests/shared";

export function isTextMimeType({
  filename,
  mimeType,
}: {
  filename: string;
  mimeType?: string;
}): boolean {
  if (!mimeType) {
    return false;
  }
  if (mimeType.startsWith("text/")) {
    return true;
  }
  const ext = getFileExtension(filename);
  if (ext) {
    const extWithDot = `.${ext}`;
    const mimeFromMap = TEXT_EXTENSION_MIME_MAP[extWithDot];
    if (mimeFromMap) {
      return mimeFromMap === mimeType;
    }
  }
  return false;
}

function getFileExtension(filename: string): string {
  const lowerName = filename.toLowerCase();
  const lastDotIndex = lowerName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return "";
  }
  return lowerName.slice(lastDotIndex + 1);
}
