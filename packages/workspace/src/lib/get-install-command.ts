import { type Info } from "@netlify/build-info/node";
import { parseCommandString } from "execa";

import { type AppConfig } from "./app-config/types";
import { PackageManager } from "./package-manager";

export function getInstallCommand({
  appConfig,
  buildInfo: { packageManager },
}: {
  appConfig: AppConfig;
  buildInfo: Info;
}) {
  // eslint-disable-next-line unicorn/prefer-ternary
  if (!packageManager || packageManager.name === PackageManager.PNPM) {
    return {
      installCommand:
        appConfig.type === "version" || appConfig.type === "sandbox"
          ? // These app types are nested in the project directory, so we need
            // to ignore the workspace config otherwise PNPM may not install the
            // dependencies correctly
            [
              appConfig.workspaceConfig.pnpmBinPath,
              "install",
              "--ignore-workspace",
            ]
          : [appConfig.workspaceConfig.pnpmBinPath, "install"],
      name: PackageManager.PNPM,
    };
  } else {
    return {
      installCommand: parseCommandString(packageManager.installCommand),
      name: packageManager.name,
    };
  }
}
