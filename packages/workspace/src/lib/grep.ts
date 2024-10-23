import { rgPath } from "@vscode/ripgrep";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { fileExists } from "./file-exists";

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
  const exists = await fileExists(rootDir);
  if (!exists) {
    return {
      matches: [],
      totalMatches: 0,
      truncated: false,
    };
  }

  const limit = options.limit ?? 100;

  return new Promise<GrepResult>((resolve, reject) => {
    const args = ["-n", "--smart-case"];

    // Don't use ripgrep's --sort option as it makes it single-threaded
    // We'll sort manually after getting results

    // Add include pattern (glob)
    if (options.include) {
      args.push("--glob", options.include);
    }

    // Add the search pattern
    args.push(pattern, options.searchPath || "./");

    const ripgrep = spawn(rgPath, args, {
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

        // Find the first two colons to properly parse file:line-number:content
        const firstColon = line.indexOf(":");
        const secondColon = line.indexOf(":", firstColon + 1);

        if (firstColon === -1 || secondColon === -1) {
          continue;
        }

        const filePath = line.slice(0, Math.max(0, firstColon));
        const lineNumStr = line.slice(firstColon + 1, secondColon);
        const lineText = line.slice(Math.max(0, secondColon + 1));

        if (!filePath || !lineNumStr || !lineText) {
          continue;
        }

        const lineNum = Number.parseInt(lineNumStr, 10);
        if (Number.isNaN(lineNum)) {
          continue;
        }

        try {
          const absolutePath = absolutePathJoin(rootDir, filePath);
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
