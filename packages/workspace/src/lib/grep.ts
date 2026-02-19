import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";
import { parseRipgrepLines, spawnRipgrep } from "./ripgrep";
interface GrepMatch {
  lineNum: number;
  lineText: string;
  modifiedAt: number;
  path: string;
}

interface GrepResult {
  hasErrors: boolean;
  matches: GrepMatch[];
  totalMatches: number;
  truncated: boolean;
}

export async function grep(options: {
  cwd: AbsolutePath;
  include?: string;
  limit: number;
  pattern: string;
  searchPath: string;
  signal: AbortSignal;
}): Promise<GrepResult> {
  const { cwd, include, limit, pattern, searchPath, signal } = options;

  const exists = await pathExists(cwd);
  if (!exists) {
    return {
      hasErrors: false,
      matches: [],
      totalMatches: 0,
      truncated: false,
    };
  }

  const args = [
    "--line-number",
    "--with-filename", // Include the filename in the output, even if there's only one match
    "--field-match-separator=|", // Use a custom field match separator to avoid parsing issues on Windows due to : in the path
    "--smart-case", // Searches case insensitively if the pattern is all lowercase, otherwise searches case sensitively
    "--path-separator=/", // Use / path separators on Windows for consistency
    "--hidden",
  ];

  // Don't use ripgrep's --sort option as it makes it single-threaded
  // We'll sort manually after getting results

  // Add include pattern (glob)
  if (include) {
    args.push("--glob", include);
  }

  args.push("--regexp", pattern, "--", searchPath);

  const { code, stderr, stdout } = await spawnRipgrep({ args, cwd, signal });

  // If ripgrep returns no matches, it exits with code 1
  if (code === 1 && !stderr) {
    return {
      hasErrors: false,
      matches: [],
      totalMatches: 0,
      truncated: false,
    };
  }

  const hasErrors = code === 2;

  if (code !== 0 && code !== 2) {
    throw new Error(`ripgrep exited with code ${code ?? "unknown"}: ${stderr}`);
  }

  if (hasErrors && !stdout.trim()) {
    throw new Error(`ripgrep exited with code 2: ${stderr}`);
  }

  const lines = parseRipgrepLines(stdout);
  const matches: GrepMatch[] = [];
  let totalMatches = 0;

  for (const line of lines) {
    const [filePath, lineNumStr, ...lineTextParts] = line.split("|");
    if (!filePath || !lineNumStr || lineTextParts.length === 0) {
      continue;
    }

    const lineNum = Number.parseInt(lineNumStr, 10);
    if (Number.isNaN(lineNum)) {
      continue;
    }

    totalMatches++;

    if (matches.length >= limit) {
      continue;
    }

    const lineText = lineTextParts.join("|");
    const MAX_LINE_LENGTH = 2000;
    const truncatedLineText =
      lineText.length > MAX_LINE_LENGTH
        ? lineText.slice(0, Math.max(0, MAX_LINE_LENGTH)) + "..."
        : lineText;
    // If filePath is already absolute, use it directly; otherwise join with cwd
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : absolutePathJoin(cwd, filePath);
    try {
      const stats = await fs.stat(absolutePath);
      matches.push({
        lineNum,
        lineText: truncatedLineText,
        modifiedAt: stats.mtime.getTime(),
        path: filePath,
      });
    } catch {
      // Skip files that can't be stat'd
      continue;
    }
  }

  return {
    hasErrors,
    matches,
    totalMatches,
    truncated: totalMatches > limit,
  };
}
