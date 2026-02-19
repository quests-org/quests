import { glob, type GlobOptions } from "glob";
import ms from "ms";
import { ok } from "neverthrow";
import { alphabetical } from "radashi";
import { z } from "zod";

import { getIgnore } from "../lib/get-ignore";
import { resolveAgentPath } from "../lib/resolve-agent-path";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const GLOB_LIMIT = 500;

export const Glob = setupTool({
  inputSchema: (agentName) => {
    const baseSchema = BaseInputSchema.extend({
      pattern: z
        .string()
        .meta({ description: "Glob pattern to match files against" }),
    });

    if (agentName === "retrieval") {
      return baseSchema.extend({
        path: z.string().meta({
          description: "Absolute path to an attached folder to search within.",
        }),
      });
    }

    return baseSchema.extend({
      path: z.string().optional().meta({
        description:
          "Relative path to a folder to search within. Defaults to the project root if not specified.",
      }),
    });
  },
  name: "glob",
  outputSchema: z.object({
    error: z.string().optional(),
    files: z.array(z.string()),
    // TODO: Remove `.optional()` after 2026-03-17 (backward compat)
    totalFiles: z.number().optional(),
    truncated: z.boolean().optional(),
  }),
}).create({
  description: (agentName) => {
    if (agentName === "retrieval") {
      return "Find files matching a glob pattern within attached folders. You must specify an absolute path to an attached folder to search within.";
    }
    return "Find files matching a glob pattern in the codebase. Specify a path to search within a specific folder, or omit to search from the project root.";
  },
  execute: async ({ agentName, appConfig, input, projectState }) => {
    const pathResult = resolveAgentPath({
      agentName,
      appDir: appConfig.appDir,
      attachedFolders: projectState.attachedFolders,
      inputPath: input.path,
      isRequired: agentName === "retrieval",
    });

    if (pathResult.isErr()) {
      return ok({
        error: pathResult.error.message,
        files: [],
        totalFiles: 0,
        truncated: false,
      });
    }

    const { absolutePath: searchRoot } = pathResult.value;
    const globOptions: GlobOptions = {
      absolute: agentName === "retrieval",
      cwd: searchRoot,
      posix: true, // Use / path separators on Windows for consistency
    };

    if (agentName !== "retrieval") {
      const ignore = await getIgnore(searchRoot);
      globOptions.ignore = {
        ignored: (p) => ignore.ignores(p.name),
      };
    }

    const rawFiles = await glob(input.pattern, globOptions);
    const allFiles = rawFiles.map(String);

    const sorted = alphabetical(allFiles, (f) => f);
    const truncated = sorted.length > GLOB_LIMIT;
    const files = truncated ? sorted.slice(0, GLOB_LIMIT) : sorted;

    return ok({ files, totalFiles: sorted.length, truncated });
  },
  readOnly: true,
  timeoutMs: ms("15 seconds"),
  toModelOutput: ({ output }) => {
    if (output.error) {
      return {
        type: "error-text",
        value: output.error,
      };
    }
    if (output.files.length === 0) {
      return {
        type: "error-text",
        value: "No files found matching the pattern",
      };
    }

    const lines = [
      `Found ${output.totalFiles ?? output.files.length} files`,
      ...output.files,
    ];

    if (output.truncated) {
      lines.push(
        "",
        "(Results are truncated. Consider using a more specific path or pattern.)",
      );
    }

    return {
      type: "text",
      value: lines.join("\n"),
    };
  },
});
