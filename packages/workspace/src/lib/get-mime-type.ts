import { detectXml } from "@file-type/xml";
import { FileTypeParser } from "file-type";
import { isBinaryFile } from "isbinaryfile";
import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";

const EXTENSION_MIME_MAP: Record<string, string> = {
  ".htm": "text/html",
  ".html": "text/html",
};

export async function getMimeType(filePath: AbsolutePath): Promise<string> {
  try {
    const parser = new FileTypeParser({ customDetectors: [detectXml] });
    const fileType = await parser.fromBuffer(await fs.readFile(filePath));

    if (fileType?.mime) {
      return fileType.mime;
    }

    const isBinary = await isBinaryFile(filePath);
    if (isBinary) {
      return "application/octet-stream";
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext && EXTENSION_MIME_MAP[ext]) {
      return EXTENSION_MIME_MAP[ext];
    }

    return "text/plain";
  } catch {
    return "application/octet-stream";
  }
}
