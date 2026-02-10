import { z } from "zod";

import { FolderAttachment } from "../folder-attachment";
import { RelativePathSchema } from "../paths";

export namespace SessionMessageDataPart {
  export const NameSchema = z.enum(["gitCommit", "fileAttachments"]);

  export type Name = z.output<typeof NameSchema>;

  const GitCommitDataPartSchema = z.object({
    ref: z.string(),
    restoredFromRef: z.string().optional(),
  });

  export type GitCommitDataPart = z.output<typeof GitCommitDataPartSchema>;

  const FileAttachmentDataPartSchema = z.object({
    filename: z.string(),
    filePath: RelativePathSchema,
    gitRef: z.string(),
    mimeType: z.string(),
    size: z.number(),
  });

  export type FileAttachmentDataPart = z.output<
    typeof FileAttachmentDataPartSchema
  >;

  export type FolderAttachmentDataPart = FolderAttachment.Type;

  export const FileAttachmentsDataPartSchema = z.object({
    files: z.array(FileAttachmentDataPartSchema),
    folders: z.array(FolderAttachment.Schema).optional(),
  });

  export type FileAttachmentsDataPart = z.output<
    typeof FileAttachmentsDataPartSchema
  >;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const DataPartsSchema = z.object({
    [NameSchema.enum.fileAttachments]: FileAttachmentsDataPartSchema,
    [NameSchema.enum.gitCommit]: GitCommitDataPartSchema,
  });
  export type DataParts = z.output<typeof DataPartsSchema>;
}
