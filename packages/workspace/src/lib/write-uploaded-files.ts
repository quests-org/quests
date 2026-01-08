import { ok, ResultAsync, safeTry } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import { APP_FOLDER_NAMES } from "../constants";
import { type AbsolutePath, RelativePathSchema } from "../schemas/paths";
import { type SessionMessageDataPart } from "../schemas/session/message-data-part";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { StoreId } from "../schemas/store-id";
import { type Upload } from "../schemas/upload";
import { absolutePathJoin } from "./absolute-path-join";
import { TypedError } from "./errors";
import { getMimeType } from "./get-mime-type";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { ensureGitRepo } from "./git/ensure-git-repo";

type FileAttachmentWithoutRef = Omit<
  SessionMessageDataPart.FileAttachmentDataPart,
  "gitRef"
>;

export async function writeUploadedFiles({
  appDir,
  files,
  messageId,
  sessionId,
}: {
  appDir: AbsolutePath;
  files: Upload.Type[];
  messageId: StoreId.Message;
  sessionId: StoreId.Session;
}) {
  return safeTry(async function* () {
    const uploadsDir = absolutePathJoin(appDir, APP_FOLDER_NAMES.uploads);
    yield* ResultAsync.fromPromise(
      fs.mkdir(uploadsDir, { recursive: true }),
      (error) =>
        new TypedError.FileSystem(
          error instanceof Error ? error.message : "Unknown error",
          { cause: error },
        ),
    );

    const fileInfos: FileAttachmentWithoutRef[] = [];

    for (const file of files) {
      const sanitized = sanitizeFilename(file.filename);
      const uniqueFilename = yield* ResultAsync.fromPromise(
        getUniqueFilename(uploadsDir, sanitized),
        (error) =>
          new TypedError.FileSystem(
            error instanceof Error ? error.message : "Unknown error",
            { cause: error },
          ),
      );

      const relativePath = `./${APP_FOLDER_NAMES.uploads}/${uniqueFilename}`;
      const filePath = absolutePathJoin(appDir, relativePath);
      const buffer = Buffer.from(file.content, "base64");
      yield* ResultAsync.fromPromise(
        fs.writeFile(filePath, buffer),
        (error) =>
          new TypedError.FileSystem(
            error instanceof Error ? error.message : "Unknown error",
            { cause: error },
          ),
      );

      const mimeType = getMimeType(uniqueFilename);
      const stats = yield* ResultAsync.fromPromise(
        fs.stat(filePath),
        (error) =>
          new TypedError.FileSystem(
            error instanceof Error ? error.message : "Unknown error",
            { cause: error },
          ),
      );

      fileInfos.push({
        filename: uniqueFilename,
        filePath: RelativePathSchema.parse(relativePath),
        mimeType,
        size: stats.size,
      });
    }

    yield* ensureGitRepo({ appDir });

    const commitMessage =
      files.length === 1
        ? `Uploaded ${fileInfos[0]?.filename ?? "file"}`
        : `Uploaded ${files.length} files`;

    const filePaths = fileInfos.map((file) => file.filePath);
    yield* git(GitCommands.addFiles(filePaths), appDir, {});
    yield* git(GitCommands.commitWithAuthor(commitMessage), appDir, {});

    const commitRefResult = yield* git(
      GitCommands.revParse("HEAD"),
      appDir,
      {},
    );
    const gitRef = commitRefResult.stdout.toString("utf8").trim();

    const fileMetadata: SessionMessageDataPart.FileAttachmentDataPart[] =
      fileInfos.map((file) => ({
        ...file,
        gitRef,
      }));

    const part: SessionMessagePart.Type = {
      data: {
        files: fileMetadata,
      },
      metadata: {
        createdAt: new Date(),
        id: StoreId.newPartId(),
        messageId,
        sessionId,
      },
      type: "data-fileAttachments",
    };

    return ok({ part });
  });
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
