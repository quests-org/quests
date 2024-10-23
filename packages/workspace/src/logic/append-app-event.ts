import fs from "node:fs/promises";
import path from "node:path";
import { fromPromise } from "xstate";

import { APP_EVENTS_LOG_NAME } from "../constants";
import { createAppConfig } from "../lib/app-config/create";
import { getAppPrivateDir } from "../lib/app-dir-utils";
import { type AppSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";

export interface LogEntry {
  message: string;
  subdomain: AppSubdomain;
}

export const appendAppEventLogic = fromPromise<
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  void,
  { config: WorkspaceConfig; log: LogEntry }
>(async ({ input: { config, log } }) => {
  const appConfig = createAppConfig({
    subdomain: log.subdomain,
    workspaceConfig: config,
  });
  const appPrivateFolder = getAppPrivateDir(appConfig.appDir);

  await fs.mkdir(appPrivateFolder, { recursive: true });
  await fs.appendFile(
    path.join(appPrivateFolder, APP_EVENTS_LOG_NAME),
    log.message + "\n",
  );
});
