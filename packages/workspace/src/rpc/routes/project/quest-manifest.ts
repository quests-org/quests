import { call, eventIterator } from "@orpc/server";
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
      icon: z
        .object({
          background: z.string(),
          lucide: AppIconsSchema,
        })
        .optional(),
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

    publisher.publish("project.updated", {
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

const live = {
  bySubdomain: base
    .input(z.object({ subdomain: ProjectSubdomainSchema }))
    .output(eventIterator(QuestManifestSchema.nullable()))
    .handler(async function* ({ context, input, signal }) {
      yield call(bySubdomain, input, { context, signal });

      const projectUpdates = publisher.subscribe("project.updated", { signal });

      for await (const payload of projectUpdates) {
        if (payload.subdomain === input.subdomain) {
          yield call(bySubdomain, input, { context, signal });
        }
      }
    }),
};

export const projectQuestConfig = {
  bySubdomain,
  live,
  update,
};
