import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath, AbsolutePathSchema } from "../schemas/paths";
import { parseRipgrepLines, spawnRipgrep } from "./ripgrep";

export async function glob(options: {
  absolute: true;
  cwd: string;
  pattern: string;
  signal: AbortSignal;
}): Promise<AbsolutePath[]>;
export async function glob(options: {
  absolute?: false;
  cwd: string;
  pattern: string;
  signal: AbortSignal;
}): Promise<string[]>;
export async function glob({
  absolute = false,
  cwd,
  pattern,
  signal,
}: {
  absolute?: boolean;
  cwd: string;
  pattern: string;
  signal: AbortSignal;
}): Promise<AbsolutePath[] | string[]> {
  const searchTarget = absolute ? cwd : ".";
  const spawnCwd = absolute ? undefined : cwd;

  const args = [
    "--files",
    "--glob",
    pattern,
    "--path-separator=/",
    "--hidden",
    "--no-messages",
    searchTarget,
  ];

  const { code, stderr, stdout } = await spawnRipgrep({
    args,
    cwd: spawnCwd,
    signal,
  });

  if (code === 1) {
    return [];
  }

  if (code !== 0 && code !== 2) {
    throw new Error(`ripgrep exited with code ${code ?? "unknown"}: ${stderr}`);
  }

  const lines = parseRipgrepLines(stdout);
  return absolute ? lines.map((p) => AbsolutePathSchema.parse(p)) : lines;
}

export async function globSortedByMtime({
  absolute = false,
  cwd,
  pattern,
  signal,
}: {
  absolute?: boolean;
  cwd: string;
  pattern: string;
  signal: AbortSignal;
}): Promise<string[]> {
  const files = absolute
    ? await glob({ absolute: true, cwd, pattern, signal })
    : await glob({ absolute: false, cwd, pattern, signal });

  const withStats = await Promise.all(
    files.map(async (filePath) => {
      try {
        const stats = await fs.stat(
          path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath),
        );
        return { filePath, mtime: stats.mtime.getTime() };
      } catch {
        return { filePath, mtime: 0 };
      }
    }),
  );

  withStats.sort((a, b) => b.mtime - a.mtime);

  return withStats.map((s) => s.filePath);
}

// Agents sometimes pass the full absolute path as the pattern instead of a
// relative glob. ripgrep's --glob flag treats the pattern as relative to cwd,
// so an absolute path would never match. Strip the cwd prefix if present.
export function resolveGlobPattern({
  cwd,
  pattern,
}: {
  cwd: string;
  pattern: string;
}): string {
  const cwdWithSep = cwd.endsWith(path.sep) ? cwd : cwd + path.sep;
  if (path.isAbsolute(pattern) && pattern.startsWith(cwdWithSep)) {
    return pattern.slice(cwdWithSep.length);
  }
  return pattern;
}
