import { ok, ResultAsync, safeTry } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { ulid } from "ulid";

import { APP_FOLDER_NAMES } from "../constants";
import { type FileUpload } from "../schemas/file-upload";
import { FolderAttachment } from "../schemas/folder-attachment";
import {
  type AbsolutePath,
  AbsolutePathSchema,
  type AppDir,
  RelativePathSchema,
} from "../schemas/paths";
import { type SessionMessageDataPart } from "../schemas/session/message-data-part";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { StoreId } from "../schemas/store-id";
import { absolutePathJoin } from "./absolute-path-join";
import { TypedError } from "./errors";
import { getCurrentDate } from "./get-current-date";
import { getMimeType } from "./get-mime-type";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { ensureGitRepo } from "./git/ensure-git-repo";
import { getProjectState, setProjectState } from "./project-state-store";

type FileAttachmentWithoutRef = Omit<
  SessionMessageDataPart.FileAttachmentDataPart,
  "gitRef"
>;

export async function writeUploadedAttachments({
  appDir,
  files,
  folders,
  messageId,
  sessionId,
}: {
  appDir: AppDir;
  files?: FileUpload.Type[];
  folders?: { path: string }[];
  messageId: StoreId.Message;
  sessionId: StoreId.Session;
}) {
  return safeTry(async function* () {
    const fileInfos: FileAttachmentWithoutRef[] = [];
    const folderAttachments: FolderAttachment.Type[] = [];

    if (files && files.length > 0) {
      const inputDir = absolutePathJoin(appDir, APP_FOLDER_NAMES.userProvided);
      yield* ResultAsync.fromPromise(
        fs.mkdir(inputDir, { recursive: true }),
        (error) =>
          new TypedError.FileSystem(
            error instanceof Error ? error.message : "Unknown error",
            { cause: error },
          ),
      );

      for (const file of files) {
        const sanitized = sanitizeFilename(file.filename);
        const uniqueFilename = yield* ResultAsync.fromPromise(
          getUniqueFilename(inputDir, sanitized),
          (error) =>
            new TypedError.FileSystem(
              error instanceof Error ? error.message : "Unknown error",
              { cause: error },
            ),
        );

        const relativePath = `./${APP_FOLDER_NAMES.userProvided}/${uniqueFilename}`;
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
          ? `Added ${fileInfos[0]?.filename ?? "file"}`
          : `Added ${files.length} files`;

      const filePaths = fileInfos.map((file) => file.filePath);
      yield* git(GitCommands.addFiles(filePaths), appDir, {});
      yield* git(GitCommands.commitWithAuthor(commitMessage), appDir, {});
    }

    if (folders && folders.length > 0) {
      const projectState = await getProjectState(appDir);
      const existingFolders = projectState.attachedFolders ?? {};

      const newFolders: Record<string, FolderAttachment.Type> = {};

      for (const folder of folders) {
        const baseName = path.basename(folder.path) || "folder";
        const uniqueName = getUniqueFolderName(
          baseName,
          existingFolders,
          newFolders,
        );

        const folderAttachment: FolderAttachment.Type = {
          createdAt: getCurrentDate().getTime(),
          id: FolderAttachment.IdSchema.parse(ulid()),
          name: uniqueName,
          path: AbsolutePathSchema.parse(folder.path),
        };

        newFolders[uniqueName] = folderAttachment;
        folderAttachments.push(folderAttachment);
      }

      await setProjectState(appDir, {
        attachedFolders: { ...existingFolders, ...newFolders },
      });
    }

    let gitRef: string | undefined;
    if (fileInfos.length > 0) {
      const commitRefResult = yield* git(
        GitCommands.revParse("HEAD"),
        appDir,
        {},
      );
      gitRef = commitRefResult.stdout.toString("utf8").trim();
    }

    const fileMetadata: SessionMessageDataPart.FileAttachmentDataPart[] =
      fileInfos.map((file) => ({
        ...file,
        gitRef: gitRef ?? "",
      }));

    const part: SessionMessagePart.Type = {
      data: {
        files: fileMetadata,
        folders: folderAttachments.length > 0 ? folderAttachments : undefined,
      },
      metadata: {
        createdAt: new Date(),
        id: StoreId.newPartId(),
        messageId,
        sessionId,
      },
      type: "data-attachments",
    };

    return ok({ part });
  });
}

async function getUniqueFilename(
  inputDir: AbsolutePath,
  filename: string,
): Promise<string> {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  let candidate = filename;
  let counter = 1;

  while (true) {
    const filePath = absolutePathJoin(inputDir, candidate);
    try {
      await fs.access(filePath);
      candidate = `${base}-${counter}${ext}`;
      counter++;
    } catch {
      return candidate;
    }
  }
}

function getUniqueFolderName(
  baseName: string,
  existingFolders: Record<string, FolderAttachment.Type>,
  newFolders: Record<string, FolderAttachment.Type>,
): string {
  let candidate = baseName;
  let counter = 1;

  while (candidate in existingFolders || candidate in newFolders) {
    candidate = `${baseName}-${counter}`;
    counter++;
  }

  return candidate;
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
