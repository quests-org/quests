import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath, RelativePathSchema } from "../schemas/paths";
import { type SessionMessageDataPart } from "../schemas/session/message-data-part";
import { type Upload } from "../schemas/upload";
import { absolutePathJoin } from "./absolute-path-join";

const UPLOADS_FOLDER = "uploads";

export async function writeUploadedFiles(
  appDir: AbsolutePath,
  files: Upload.Type[],
) {
  if (files.length === 0) {
    return { files: [] };
  }

  const uploadsDir = absolutePathJoin(appDir, UPLOADS_FOLDER);
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileMetadata: SessionMessageDataPart.FileAttachmentDataPart[] = [];

  for (const file of files) {
    const sanitized = sanitizeFilename(file.filename);
    const uniqueFilename = await getUniqueFilename(uploadsDir, sanitized);

    const relativePath = `./${UPLOADS_FOLDER}/${uniqueFilename}`;
    const filePath = absolutePathJoin(appDir, relativePath);
    const buffer = Buffer.from(file.content, "base64");
    await fs.writeFile(filePath, buffer);

    fileMetadata.push({
      filename: uniqueFilename,
      filePath: RelativePathSchema.parse(relativePath),
      mimeType: file.mimeType,
      size: file.size,
    });
  }

  return { files: fileMetadata };
}

async function getUniqueFilename(
  uploadsDir: AbsolutePath,
  filename: string,
): Promise<string> {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  let candidate = filename;
  let counter = 1;

  while (true) {
    const filePath = absolutePathJoin(uploadsDir, candidate);
    try {
      await fs.access(filePath);
      candidate = `${base}-${counter}${ext}`;
      counter++;
    } catch {
      return candidate;
    }
  }
}

function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  const sanitized = base
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .replaceAll(/[\u2000-\u206F\u2E00-\u2E7F\u00A0]/g, "-")
    .replaceAll(/[^\w.-]/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 200);

  return (sanitized || "file") + ext.toLowerCase();
}
