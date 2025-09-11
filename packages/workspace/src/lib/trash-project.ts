import { ok, ResultAsync } from "neverthrow";
import fs from "node:fs/promises";

import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { createAppConfig } from "./app-config/create";
import { pathExists } from "./path-exists";

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

      // Delete node_modules folder before trashing to avoid issues with hard links.
      // On Windows (and potentially other OS) with PNPM hard links, trashing
      // node_modules will fail. Since node_modules can be recreated, we delete
      // it first using the fastest removal method available.
      const nodeModulesPath = absolutePathJoin(
        appConfig.appDir,
        "node_modules",
      );

      if (await pathExists(nodeModulesPath)) {
        await fs.rm(nodeModulesPath, { force: true, recursive: true });
      }

      await workspaceConfig.trashItem(appConfig.appDir);

      return ok({ subdomain });
    })(),
    (error: unknown) => ({
      message: error instanceof Error ? error.message : "Unknown error",
      type: "unknown" as const,
    }),
  );
}
