import { z } from "zod";

export namespace SessionMessageDataPart {
  export const NameSchema = z.enum(["gitCommit"]);

  export type Name = z.output<typeof NameSchema>;

  const GitCommitDataPartSchema = z.object({
    ref: z.string(),
    restoredFromRef: z.string().optional(),
  });

  export type GitCommitDataPart = z.output<typeof GitCommitDataPartSchema>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const DataPartsSchema = z.object({
    [NameSchema.enum.gitCommit]: GitCommitDataPartSchema,
  });
  export type DataParts = z.output<typeof DataPartsSchema>;
}
