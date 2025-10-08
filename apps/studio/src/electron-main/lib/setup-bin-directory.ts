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

      await createSymlinkOrShim(binDir, binary.name, targetPath);
    } catch (error) {
      logger.error(`Failed to setup binary ${binary.name}:`, error);
    }
  }

  logger.info(`Bin directory setup complete: ${binDir}`);
  return binDir;
}

async function createSymlinkOrShim(
  binDir: string,
  name: string,
  targetPath: string,
): Promise<void> {
  const isWindows = process.platform === "win32";
  const symlinkPath = path.join(binDir, isWindows ? `${name}.cmd` : name);

  try {
    try {
      await fs.unlink(symlinkPath);
    } catch {
      // Ignore error
    }

    if (isWindows) {
      const batchContent = `@echo off\r\n"${targetPath}" %*\r\n`;
      await fs.writeFile(symlinkPath, batchContent, "utf8");
      logger.info(`Created batch file: ${symlinkPath} -> ${targetPath}`);
    } else {
      await fs.symlink(targetPath, symlinkPath);
      logger.info(`Created symlink: ${symlinkPath} -> ${targetPath}`);
    }
  } catch (error) {
    logger.error(`Failed to create symlink/shim for ${name}:`, error);
    throw error;
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
      getTargetPath: () => getNodeModulePath("pnpm", "bin", "pnpm.cjs"),
      name: "pnpm",
    },
    {
      getTargetPath: () => getNodeModulePath("pnpm", "bin", "pnpx.cjs"),
      name: "pnpx",
    },
    {
      getTargetPath: () => {
        const basePath = getNodeModulePath("dugite", "git", "bin");
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
    {
      getTargetPath: getNodeBinaryPath,
      name: "node",
    },
  ];
}

function getNodeBinaryPath(): string {
  return process.execPath;
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
