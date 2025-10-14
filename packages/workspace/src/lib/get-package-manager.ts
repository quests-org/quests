import { type Info } from "@netlify/build-info/node";
import { parseCommandString } from "execa";

import { type AppConfig } from "./app-config/types";
import { PackageManager } from "./package-manager";

export function getPackageManager({
  appConfig,
  buildInfo: { packageManager },
}: {
  appConfig: AppConfig;
  buildInfo: Info;
}) {
  // eslint-disable-next-line unicorn/prefer-ternary
  if (!packageManager || packageManager.name === PackageManager.PNPM) {
    return {
      arguments:
        appConfig.type === "version" || appConfig.type === "sandbox"
          ? // These app types are nested in the project directory, so we need
            // to ignore the workspace config otherwise PNPM may not install the
            // dependencies correctly
            ["install", "--ignore-workspace"]
          : ["install"],
      command: appConfig.workspaceConfig.pnpmBinPath,
      name: PackageManager.PNPM,
    };
  } else {
    return {
      arguments: parseCommandString(packageManager.installCommand),
      command: packageManager.installCommand,
      name: packageManager.name,
    };
  }
}
