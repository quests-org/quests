import fs from "node:fs/promises";
import path from "node:path";

const SHEBANG = "#!/bin/sh";

export async function readShim(shimPath: string): Promise<null | string> {
  const isWindows = process.platform === "win32";
  const targetPath = isWindows ? `${shimPath}.cmd` : shimPath;

  try {
    const content = await fs.readFile(targetPath, "utf8");

    if (isWindows) {
      return readWindowsShim(content, shimPath);
    }
    return readPosixShim(content, shimPath);
  } catch {
    return null;
  }
}

function readPosixShim(content: string, shimPath: string): null | string {
  if (!content.startsWith(SHEBANG)) {
    return null;
  }

  const execPattern =
    /exec\s+(?:node|"\$basedir\/node")\s+"?(\$basedir\/[^"\s]+|[^"\s]+)"?/;
  const match = execPattern.exec(content);

  if (!match?.[1]) {
    return null;
  }

  let targetPath = match[1];
  targetPath = targetPath.replaceAll("$basedir/", "");

  return resolveShimTarget(shimPath, targetPath);
}

function readWindowsShim(content: string, shimPath: string): null | string {
  const ifExistPattern = /@IF EXIST[^"]*"[^"]*node\.exe"[^"]*"([^"]+)"/;
  const elsePattern = /node\s+"([^"]+)"/;

  let match = ifExistPattern.exec(content);
  if (!match?.[1]) {
    match = elsePattern.exec(content);
  }

  if (!match?.[1]) {
    return null;
  }

  let targetPath = match[1];
  targetPath = targetPath.replaceAll("%~dp0\\", "").replaceAll("%~dp0", "");

  return resolveShimTarget(`${shimPath}.cmd`, targetPath);
}

function resolveShimTarget(shimPath: string, targetPath: string): string {
  const shimDir = path.dirname(shimPath);
  const resolvedPath = path.resolve(shimDir, targetPath);
  return resolvedPath;
}
