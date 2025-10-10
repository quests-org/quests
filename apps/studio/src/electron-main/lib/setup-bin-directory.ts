import cmdShim from "@zkochan/cmd-shim";
import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import { logger } from "./electron-logger";
import { readShim } from "./read-shim";

const BIN_DIR_NAME = "bin";

interface BinaryConfig {
  getTargetPath: () => string;
  name: string;
  type: "direct" | "node-modules-bin";
}

export function getBinDirectoryPath(): string {
  return path.join(app.getPath("userData"), BIN_DIR_NAME);
}

export async function setupBinDirectory(): Promise<string> {
  const binDir = getBinDirectoryPath();

  logger.info(`Setting up bin directory at: ${binDir}`);

  await ensureDirectoryExists(binDir);
  await cleanBinDirectory(binDir);

  await setupNodeLink(binDir);

  const binaries = getBinaryConfigs();

  for (const binary of binaries) {
    try {
      const targetPath = binary.getTargetPath();

      try {
        await fs.access(targetPath);
      } catch {
        logger.warn(`Binary not found, skipping: ${targetPath}`);
        continue;
      }

      await (binary.type === "node-modules-bin"
        ? linkFromNodeModulesBin(binDir, binary.name, targetPath)
        : linkDirect(binDir, binary.name, targetPath));
    } catch (error) {
      logger.error(`Failed to setup binary ${binary.name}:`, error);
    }
  }

  logger.info(`Bin directory setup complete: ${binDir}`);
  return binDir;
}

async function cleanBinDirectory(binDir: string): Promise<void> {
  try {
    const entries = await fs.readdir(binDir);

    for (const entry of entries) {
      const entryPath = path.join(binDir, entry);
      try {
        await fs.rm(entryPath, { force: true, recursive: true });
      } catch (error) {
        logger.warn(`Failed to remove ${entryPath}:`, error);
      }
    }

    logger.info(`Cleaned bin directory: ${binDir}`);
  } catch {
    logger.info(`Bin directory does not exist yet, will be created: ${binDir}`);
  }
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    logger.error(`Failed to create directory ${dirPath}:`, error);
    throw error;
  }
}

function getBinaryConfigs(): BinaryConfig[] {
  const isWindows = process.platform === "win32";

  return [
    {
      getTargetPath: () => getNodeModulePath(".bin"),
      name: "pnpm",
      type: "node-modules-bin",
    },
    {
      getTargetPath: () => getNodeModulePath(".bin"),
      name: "pnpx",
      type: "node-modules-bin",
    },
    {
      getTargetPath: () => {
        const basePath = isWindows
          ? getNodeModulePath("dugite", "git", "cmd")
          : getNodeModulePath("dugite", "git", "bin");
        return isWindows
          ? path.join(basePath, "git.exe")
          : path.join(basePath, "git");
      },
      name: "git",
      type: "direct",
    },
    {
      getTargetPath: () => {
        const basePath = getNodeModulePath("@vscode/ripgrep", "bin");
        return isWindows
          ? path.join(basePath, "rg.exe")
          : path.join(basePath, "rg");
      },
      name: "rg",
      type: "direct",
    },
  ];
}

function getNodeModulePath(...parts: string[]): string {
  const appPath = app.getAppPath();
  const modulePath = path.join(appPath, "node_modules", ...parts);

  if (app.isPackaged && appPath.endsWith(".asar")) {
    const unpackedPath = modulePath.replace(
      /app\.asar([/\\])/,
      "app.asar.unpacked$1",
    );
    return unpackedPath;
  }

  return modulePath;
}

async function linkDirect(
  binDir: string,
  name: string,
  targetPath: string,
): Promise<void> {
  const isWindows = process.platform === "win32";

  if (isWindows && targetPath.endsWith(".exe")) {
    const linkPath = path.join(binDir, `${name}.exe`);
    await fs.link(targetPath, linkPath);
    logger.info(`Created hard link: ${linkPath} -> ${targetPath}`);
  } else {
    const linkPath = path.join(binDir, name);
    await fs.symlink(targetPath, linkPath);
    logger.info(`Created symlink: ${linkPath} -> ${targetPath}`);
  }
}

async function linkFromNodeModulesBin(
  binDir: string,
  name: string,
  nodeModulesBinPath: string,
): Promise<void> {
  const shimPath = path.join(nodeModulesBinPath, name);
  const targetCjsPath = await readShim(shimPath);

  if (!targetCjsPath) {
    logger.error(`Failed to read shim: ${shimPath}`);
    throw new Error(`Failed to read shim: ${shimPath}`);
  }

  const outputPath = path.join(binDir, name);

  await cmdShim(targetCjsPath, outputPath, {
    createCmdFile: true,
    createPwshFile: false,
  });

  logger.info(`Created shim: ${outputPath} -> ${targetCjsPath}`);
}

async function setupNodeLink(binDir: string): Promise<void> {
  const isWindows = process.platform === "win32";
  const nodeExePath = process.execPath;
  const linkPath = path.join(binDir, isWindows ? "node.exe" : "node");

  try {
    if (isWindows) {
      await fs.link(nodeExePath, linkPath);
      logger.info(`Created node.exe hard link: ${linkPath} -> ${nodeExePath}`);
    } else {
      await fs.symlink(nodeExePath, linkPath);
      logger.info(`Created node symlink: ${linkPath} -> ${nodeExePath}`);
    }
  } catch (error) {
    logger.error("Failed to create node link:", error);
    throw error;
  }
}
