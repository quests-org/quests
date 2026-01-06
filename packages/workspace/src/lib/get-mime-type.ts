import { TEXT_EXTENSION_MIME_MAP } from "@quests/shared";
import { fileTypeFromBuffer } from "file-type";
import { isBinaryFile } from "isbinaryfile";
import path from "node:path";

export async function getMimeType(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  try {
    const ext = path.extname(filename).toLowerCase();
    const possibleTextMimeType = ext ? TEXT_EXTENSION_MIME_MAP[ext] : undefined;

    const fileType = await fileTypeFromBuffer(buffer);

    if (fileType?.mime) {
      return possibleTextMimeType ?? fileType.mime;
    }

    const isBinary = await isBinaryFile(buffer);
    if (isBinary) {
      return "application/octet-stream";
    }

    return possibleTextMimeType ?? "text/plain";
  } catch {
    return "application/octet-stream";
  }
}
