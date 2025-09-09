import { AppIconsSchema } from "@quests/shared/icons";
import { z } from "zod";

import {
  getProjectQuestManifest,
  updateQuestManifest,
} from "../../../lib/quest-manifest";
import { QuestManifestSchema } from "../../../schemas/quest-manifest";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { base } from "../../base";
import { publisher } from "../../publisher";

const update = base
  .input(
    z.object({
      description: z.string().optional(),
      icon: z.object({
        background: z.string(),
        lucide: AppIconsSchema,
      }),
      name: z.string(),
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(async ({ context, input }) => {
    await updateQuestManifest(input.subdomain, context.workspaceConfig, {
      description: input.description,
      icon: input.icon,
      name: input.name,
    });

    publisher.publish("project.quest-manifest-updated", {
      subdomain: input.subdomain,
    });

    context.workspaceConfig.captureEvent("project.updated");
  });

const bySubdomain = base
  .input(z.object({ subdomain: ProjectSubdomainSchema }))
  .output(QuestManifestSchema.nullable())
  .handler(async ({ context, input }) => {
    const result = await getProjectQuestManifest(
      input.subdomain,
      context.workspaceConfig,
    );

    return result ?? null;
  });

export const projectQuestConfig = {
  bySubdomain,
  update,
};
