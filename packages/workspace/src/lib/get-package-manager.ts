import { type AppConfig } from "./app-config/types";
import { PackageManager } from "./package-manager";

export function getPackageManager({ appConfig }: { appConfig: AppConfig }) {
  // For now, we only support PNPM
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
}
