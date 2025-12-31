import { detectXml } from "@file-type/xml";
import { FileTypeParser } from "file-type";
import { isBinaryFile } from "isbinaryfile";
import fs from "node:fs/promises";

import { type AbsolutePath } from "../schemas/paths";

export async function getMimeType(filePath: AbsolutePath): Promise<string> {
  try {
    const parser = new FileTypeParser({ customDetectors: [detectXml] });
    const fileType = await parser.fromBuffer(await fs.readFile(filePath));

    if (fileType?.mime) {
      return fileType.mime;
    }

    const isBinary = await isBinaryFile(filePath);
    return isBinary ? "application/octet-stream" : "text/plain";
  } catch {
    return "application/octet-stream";
  }
}
