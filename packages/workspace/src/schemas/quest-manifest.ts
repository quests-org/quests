import { AppIconsSchema } from "@quests/shared/icons";
import { z } from "zod";

export const QuestManifestModeSchema = z.enum(["app-builder", "chat"]);

export const QuestManifestSchema = z.object({
  description: z.string().optional(),
  icon: z
    .object({
      background: z.string().optional(),
      // eslint-disable-next-line unicorn/prefer-top-level-await
      lucide: AppIconsSchema.optional().catch(undefined),
    })
    .optional(),
  // eslint-disable-next-line unicorn/prefer-top-level-await
  mode: QuestManifestModeSchema.optional().catch("app-builder"),
  name: z.string(),
});

export type QuestManifest = z.output<typeof QuestManifestSchema>;
export type QuestManifestMode = z.output<typeof QuestManifestModeSchema>;
