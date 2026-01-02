import { TEXT_EXTENSION_MIME_MAP } from "@quests/shared";
import { FileTypeParser } from "file-type";
import { isBinaryFile } from "isbinaryfile";
import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";

export async function getMimeType(filePath: AbsolutePath): Promise<string> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const possibleTextMimeType = ext ? TEXT_EXTENSION_MIME_MAP[ext] : undefined;

    const parser = new FileTypeParser();
    const fileType = await parser.fromBuffer(await fs.readFile(filePath));

    if (fileType?.mime) {
      return possibleTextMimeType ?? fileType.mime;
    }

    const isBinary = await isBinaryFile(filePath);
    if (isBinary) {
      return "application/octet-stream";
    }

    return possibleTextMimeType ?? "text/plain";
  } catch {
    return "application/octet-stream";
  }
}
