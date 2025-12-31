import { AppIconsSchema } from "@quests/shared/icons";
import { z } from "zod";

export const ProjectConfigSchema = z.object({
  description: z.string().optional(),
  icon: z
    .object({
      background: z.string().optional(),
      // eslint-disable-next-line unicorn/prefer-top-level-await
      lucide: AppIconsSchema.optional().catch(undefined),
    })
    .optional(),
  name: z.string(),
});

export type ProjectConfig = z.output<typeof ProjectConfigSchema>;
