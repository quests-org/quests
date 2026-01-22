import { TabIconsSchema } from "@quests/shared/icons";
import { z } from "zod";

export const ProjectManifestSchema = z.object({
  description: z.string().optional(),
  // eslint-disable-next-line unicorn/prefer-top-level-await
  iconName: TabIconsSchema.optional().catch(undefined),
  name: z.string().default("Untitled Project"),
});

export const ProjectManifestUpdateSchema =
  ProjectManifestSchema.partial().extend({
    name: z.string().trim().min(1).optional(),
  });

export type ProjectManifest = z.output<typeof ProjectManifestSchema>;
export type ProjectManifestUpdate = z.output<
  typeof ProjectManifestUpdateSchema
>;
