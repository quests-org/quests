import { z } from "zod";

export const artifactPanelSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("app"), versionRef: z.string().optional() }),
  z.object({
    filePath: z.string(),
    fileVersion: z.string().optional(),
    type: z.literal("file"),
  }),
]);

export type ArtifactPanel = z.output<typeof artifactPanelSchema>;
