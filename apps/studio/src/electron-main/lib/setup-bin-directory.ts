import cmdShim from "@zkochan/cmd-shim";
import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import { logger } from "./electron-logger";

const BIN_DIR_NAME = "bin";

interface BinaryConfig {
  getTargetPath: () => string;
  name: string;
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

      await linkDirect(binDir, binary.name, targetPath);
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

async function createNodeShim(
  binDir: string,
  nodeExePath: string,
): Promise<void> {
  const shimCmdPath = path.join(binDir, "node.cmd");

  const shimContent = `@ECHO OFF
SETLOCAL
"${nodeExePath}" %*
`;

  await fs.writeFile(shimCmdPath, shimContent, "utf8");
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
      getTargetPath: () => getNodeModulePath("pnpm", "bin", "pnpm.cjs"),
      name: "pnpm",
    },
    {
      getTargetPath: () => getNodeModulePath("pnpm", "bin", "pnpx.cjs"),
      name: "pnpx",
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
    },
    {
      getTargetPath: () => {
        const basePath = getNodeModulePath("@vscode/ripgrep", "bin");
        return isWindows
          ? path.join(basePath, "rg.exe")
          : path.join(basePath, "rg");
      },
      name: "rg",
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

  if (isWindows) {
    const outputPath = path.join(binDir, name);
    await cmdShim(targetPath, outputPath, {
      createCmdFile: true,
      createPwshFile: false,
    });
    logger.info(`Created shim: ${outputPath} -> ${targetPath}`);
  } else {
    const linkPath = path.join(binDir, name);
    await fs.symlink(targetPath, linkPath);
    logger.info(`Created symlink: ${linkPath} -> ${targetPath}`);
  }
}

async function setupNodeLink(binDir: string): Promise<void> {
  const isWindows = process.platform === "win32";
  const nodeExePath = process.execPath;
  const linkPath = path.join(binDir, isWindows ? "node.exe" : "node");

  try {
    if (isWindows) {
      await createNodeShim(binDir, nodeExePath);
      logger.info(`Created node shim: ${binDir} -> ${nodeExePath}`);
    } else {
      await fs.symlink(nodeExePath, linkPath);
      logger.info(`Created node symlink: ${linkPath} -> ${nodeExePath}`);
    }
  } catch (error) {
    logger.error("Failed to create node link:", error);
    throw error;
  }
}
