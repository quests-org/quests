import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { type AbsolutePath } from "../schemas/paths";
import { type SessionMessage } from "../schemas/session/message";
import { absolutePathJoin } from "./absolute-path-join";

const UPLOADS_FOLDER = "uploads";

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

export const UploadedFileSchema = z.object({
  content: z.string(),
  filename: z.string(),
});

type UploadedFile = z.output<typeof UploadedFileSchema>;

export function appendFilesToMessage(
  message: SessionMessage.UserWithParts,
  filePaths: string[],
): SessionMessage.UserWithParts {
  if (filePaths.length === 0) {
    return message;
  }

  const fileList = `Uploaded files:\n${filePaths.map((p) => `- ${p}`).join("\n")}`;
  const firstTextPart = message.parts.find((p) => p.type === "text");

  if (!firstTextPart) {
    return message;
  }

  return {
    ...message,
    parts: message.parts.map((p) =>
      p === firstTextPart ? { ...p, text: `${p.text}\n\n${fileList}` } : p,
    ),
  };
}

export async function writeUploadedFiles(
  appDir: AbsolutePath,
  files: UploadedFile[],
) {
  if (files.length === 0) {
    return { paths: [] };
  }

  const uploadsDir = absolutePathJoin(appDir, UPLOADS_FOLDER);
  await fs.mkdir(uploadsDir, { recursive: true });

  const paths: string[] = [];

  for (const file of files) {
    const sanitized = sanitizeFilename(file.filename);
    const uniqueFilename = await getUniqueFilename(uploadsDir, sanitized);

    const filePath = absolutePathJoin(uploadsDir, uniqueFilename);
    const buffer = Buffer.from(file.content, "base64");
    await fs.writeFile(filePath, buffer);

    const relativePath = `./${UPLOADS_FOLDER}/${uniqueFilename}`;
    paths.push(relativePath);
  }

  return { paths };
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
