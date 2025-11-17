import { AIGatewayModelURI } from "@quests/ai-gateway";
import { type ProjectMode } from "@quests/shared";
import { ulid } from "ulid";

import { PROJECT_SUBDOMAIN_MODE_PREFIXES } from "../../constants";
import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { generateNewFolderName } from "../generate-folder-name";
import { getCurrentDate } from "../get-current-date";
import { createAppConfig, type CreateAppConfigReturn } from "./create";

const MAX_SUBDOMAIN_LENGTH = 200;

export async function newProjectConfig({
  evalName,
  mode,
  modelURI,
  workspaceConfig,
}: {
  evalName?: string;
  mode: ProjectMode;
  modelURI?: string;
  workspaceConfig: WorkspaceConfig;
}): Promise<CreateAppConfigReturn<ProjectSubdomain>> {
  let rawSubdomain: string;

  if (mode === "chat") {
    rawSubdomain = `${PROJECT_SUBDOMAIN_MODE_PREFIXES.chat}-${ulid().toLowerCase()}`;
  } else if (mode === "eval" && evalName && modelURI) {
    const evalSlug = slugify(evalName);
    const rawModelId = AIGatewayModelURI.parse(modelURI)
      .map((m) => m.canonicalId)
      .getOrDefault("unknown");
    const modelIdSlug = slugify(rawModelId);
    const timestamp = getCurrentDate().getTime();
    const prefix = `${PROJECT_SUBDOMAIN_MODE_PREFIXES.eval}-`;
    const suffix = `-${timestamp}`;
    const availableLength =
      MAX_SUBDOMAIN_LENGTH - prefix.length - suffix.length;
    const combinedSlugs = `${evalSlug}-${modelIdSlug}`;
    const truncatedSlugs =
      combinedSlugs.length > availableLength
        ? combinedSlugs.slice(0, availableLength)
        : combinedSlugs;
    rawSubdomain = `${prefix}${truncatedSlugs}${suffix}`;
  } else {
    rawSubdomain = await generateNewFolderName(workspaceConfig.projectsDir);
  }

  return createAppConfig({
    subdomain: ProjectSubdomainSchema.parse(rawSubdomain),
    workspaceConfig,
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}
