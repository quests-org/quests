import fs from "node:fs/promises";
import path from "node:path";

const SHEBANG = "#!/bin/sh";

export async function readShim(shimPath: string): Promise<null | string> {
  const isWindows = process.platform === "win32";
  const shimFilePath = isWindows ? `${shimPath}.cmd` : shimPath;

  try {
    const content = await fs.readFile(shimFilePath, "utf8");

    const relativePath = isWindows
      ? readWindowsShim(content)
      : readPosixShim(content);

    if (!relativePath) {
      return null;
    }

    return resolveShimTarget(shimFilePath, relativePath);
  } catch {
    return null;
  }
}

export function readWindowsShim(content: string): null | string {
  const pattern = /node(?:\.exe)?\s+"([^"]+)"/;

  const match = pattern.exec(content);

  if (!match?.[1]) {
    return null;
  }

  let targetPath = match[1];
  targetPath = targetPath.replaceAll("%~dp0\\", "").replaceAll("%~dp0", "");

  return targetPath;
}

export function resolveShimTarget(
  shimFilePath: string,
  relativePath: string,
): string {
  const shimDir = path.dirname(shimFilePath);
  return path.resolve(shimDir, relativePath);
}

function readPosixShim(content: string): null | string {
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

  return targetPath;
}
