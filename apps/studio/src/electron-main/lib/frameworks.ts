import { getAllPackageBinaryPaths } from "@/electron-main/lib/link-bins";

const FrameworkErrorCode = {
  missingDevScript: "missing_dev_script",
  missingPackageJson: "missing_package_json",
  missingRootPath: "missing_root_path",
  unsupportedFramework: "unsupported_framework",
} as const;

const Frameworks = {
  next: {
    args: (subCommand: string, serverPort: number) => [
      subCommand,
      "--port",
      String(serverPort),
    ],
    bin: "next",
  },
  vite: {
    args: (subCommand: string, serverPort: number) => [
      subCommand,
      "--port",
      String(serverPort),
      "--strictPort",
      "--clearScreen",
      "false",
      // Avoids logging confusing localhost and port info
      "--logLevel",
      "warn",
    ],
    bin: "vite",
  },
};

export const getFramework = async ({
  rootDir,
  script,
}: {
  rootDir: string;
  script: string;
}) => {
  const binaryPaths = await getAllPackageBinaryPaths(rootDir);

  const frameworkType = script
    ? Object.keys(Frameworks).find((type) => script.includes(type))
    : null;

  const framework = frameworkType
    ? Frameworks[frameworkType as keyof typeof Frameworks]
    : null;
  const [frameworkModulePath] = framework?.bin
    ? (binaryPaths.get(framework.bin) ?? [])
    : [];

  return framework && frameworkModulePath
    ? {
        framework,
        frameworkModulePath,
      }
    : {
        error: FrameworkErrorCode.unsupportedFramework,
      };
};
