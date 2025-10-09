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

  try {
    if (isWindows) {
      await createWindowsShims(binDir, name, targetPath);
    } else {
      const symlinkPath = path.join(binDir, name);
      try {
        await fs.unlink(symlinkPath);
      } catch {
        // Ignore error
      }
      await fs.symlink(targetPath, symlinkPath);
      logger.info(`Created symlink: ${symlinkPath} -> ${targetPath}`);
    }
  } catch (error) {
    logger.error(`Failed to create symlink/shim for ${name}:`, error);
    throw error;
  }
}

async function createWindowsShims(
  binDir: string,
  name: string,
  targetPath: string,
): Promise<void> {
  const isCjsFile = targetPath.endsWith(".cjs");
  const isJsFile = targetPath.endsWith(".js") || isCjsFile;

  const cmdPath = path.join(binDir, `${name}.cmd`);
  const ps1Path = path.join(binDir, `${name}.ps1`);

  try {
    await fs.unlink(cmdPath);
  } catch {
    // Ignore error
  }
  try {
    await fs.unlink(ps1Path);
  } catch {
    // Ignore error
  }

  if (isJsFile) {
    const cmdContent = `@IF EXIST "%~dp0\\node.exe" (\r\n  "%~dp0\\node.exe" "${targetPath}" %*\r\n) ELSE (\r\n  @SET PATHEXT=%PATHEXT:;.JS;=;%\r\n  node "${targetPath}" %*\r\n)\r\n`;

    const ps1Content = `#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  & "$basedir/node$exe" "${targetPath}" $args
  $ret=$LASTEXITCODE
} else {
  & "node$exe" "${targetPath}" $args
  $ret=$LASTEXITCODE
}
exit $ret
`;

    await fs.writeFile(cmdPath, cmdContent, "utf8");
    await fs.writeFile(ps1Path, ps1Content, "utf8");
    logger.info(
      `Created PowerShell shim: ${ps1Path} and CMD fallback: ${cmdPath} -> ${targetPath}`,
    );
  } else {
    const cmdContent = `@"${targetPath}" %*\r\n`;

    const ps1Content = `#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

& "${targetPath}" $args
exit $LASTEXITCODE
`;

    await fs.writeFile(cmdPath, cmdContent, "utf8");
    await fs.writeFile(ps1Path, ps1Content, "utf8");
    logger.info(
      `Created PowerShell shim: ${ps1Path} and CMD fallback: ${cmdPath} -> ${targetPath}`,
    );
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
