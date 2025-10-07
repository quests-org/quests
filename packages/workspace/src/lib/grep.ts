import { rgPath } from "@vscode/ripgrep";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

// Fix the path to the ripgrep binary if it's in an .asar file
// via https://github.com/desktop/dugite/blob/0a316c7028f073ad05cea17fe219324e7ef13967/lib/git-environment.ts#L24
const RG_DISK_PATH = rgPath.replace(
  /[\\/]app.asar[\\/]/,
  `${path.sep}app.asar.unpacked${path.sep}`,
);

interface GrepMatch {
  lineNum: number;
  lineText: string;
  modifiedAt: number;
  path: string;
}

interface GrepResult {
  matches: GrepMatch[];
  totalMatches: number;
  truncated: boolean;
}

export async function grep(
  rootDir: AbsolutePath,
  pattern: string,
  options: {
    include?: string;
    limit?: number;
    searchPath?: string;
    signal?: AbortSignal;
    sort?: "none" | "path";
  } = {},
): Promise<GrepResult> {
  const exists = await pathExists(rootDir);
  if (!exists) {
    return {
      matches: [],
      totalMatches: 0,
      truncated: false,
    };
  }

  const limit = options.limit ?? 100;

  return new Promise<GrepResult>((resolve, reject) => {
    const args = [
      "--line-number",
      "--with-filename", // Include the filename in the output, even if there's only one match
      "--field-match-separator=|", // Use a custom field match separator to avoid parsing issues on Windows due to : in the path
      "--smart-case", // Searches case insensitively if the pattern is all lowercase, otherwise searches case sensitively
      "--path-separator=/", // Use / path separators on Windows for consistency
    ];

    // Don't use ripgrep's --sort option as it makes it single-threaded
    // We'll sort manually after getting results

    // Add include pattern (glob)
    if (options.include) {
      args.push("--glob", options.include);
    }

    args.push(pattern, options.searchPath || "./");

    const ripgrep = spawn(RG_DISK_PATH, args, {
      cwd: rootDir,
      signal: options.signal,
    });

    let stdout = "";
    let stderr = "";

    ripgrep.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    ripgrep.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    ripgrep.on("error", (error) => {
      reject(new Error(`Failed to execute ripgrep: ${error.message}`));
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ripgrep.on("close", async (code) => {
      // If ripgrep returns no matches, it exits with code 1
      if (code === 1 && !stderr) {
        resolve({
          matches: [],
          totalMatches: 0,
          truncated: false,
        });
        return;
      }

      if (code !== 0) {
        reject(
          new Error(`ripgrep exited with code ${code || "unknown"}: ${stderr}`),
        );
        return;
      }

      const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
      const matches: GrepMatch[] = [];

      for (const line of lines) {
        if (!line) {
          continue;
        }

        const [filePath, lineNumStr, ...lineTextParts] = line.split("|");
        if (!filePath || !lineNumStr || lineTextParts.length === 0) {
          continue;
        }

        const lineNum = Number.parseInt(lineNumStr, 10);
        if (Number.isNaN(lineNum)) {
          continue;
        }

        const lineText = lineTextParts.join("|");
        const absolutePath = absolutePathJoin(rootDir, filePath);
        try {
          const stats = await fs.stat(absolutePath);
          matches.push({
            lineNum,
            lineText,
            modifiedAt: stats.mtime.getTime(),
            path: filePath,
          });
        } catch {
          // Skip files that can't be stat'd
          continue;
        }
      }

      const truncated = matches.length > limit;
      const finalMatches = truncated ? matches.slice(0, limit) : matches;

      resolve({
        matches: finalMatches,
        totalMatches: matches.length,
        truncated,
      });
    });
  });
}
