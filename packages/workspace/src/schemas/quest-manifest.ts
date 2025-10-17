import { AppIconsSchema } from "@quests/shared/icons";
import { z } from "zod";

export const QuestManifestSchema = z.object({
  description: z.string().optional(),
  icon: z
    .object({
      background: z.string().optional(),
      // eslint-disable-next-line unicorn/prefer-top-level-await
      lucide: AppIconsSchema.optional().catch("square-dashed"),
    })
    .optional(),
  name: z.string(),
});

export type QuestManifest = z.output<typeof QuestManifestSchema>;
