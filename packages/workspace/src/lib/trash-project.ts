import { ok, ResultAsync } from "neverthrow";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";

interface RemoveProjectOptions {
  subdomain: ProjectSubdomain;
  workspaceConfig: WorkspaceConfig;
}

export async function trashProject({
  subdomain,
  workspaceConfig,
}: RemoveProjectOptions) {
  return ResultAsync.fromPromise(
    (async () => {
      const appConfig = createAppConfig({
        subdomain,
        workspaceConfig,
      });

      await workspaceConfig.trashItem(appConfig.appDir);

      return ok({ subdomain });
    })(),
    (error: unknown) => ({
      message: error instanceof Error ? error.message : "Unknown error",
      type: "unknown" as const,
    }),
  );
}
