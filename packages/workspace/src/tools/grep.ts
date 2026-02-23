import ms from "ms";
import { err, ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import { ensureRelativePath } from "../lib/ensure-relative-path";
import { grep } from "../lib/grep";
import { resolveAgentPath } from "../lib/resolve-agent-path";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const INPUT_PARAMS = {
  include: "include",
  path: "path",
  pattern: "pattern",
} as const;

const GREP_LIMIT = 100;

export const Grep = setupTool({
  inputSchema: (agentName) => {
    const pathDescription =
      agentName === "retrieval"
        ? "Absolute path to search within (must be within an attached folder)"
        : "The directory to search in (relative to project root). Defaults to the project root if not specified.";

    return BaseInputSchema.extend({
      [INPUT_PARAMS.include]: z.string().optional().meta({
        description:
          'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
      }),
      [INPUT_PARAMS.path]: z.string().optional().meta({
        description: pathDescription,
      }),
      [INPUT_PARAMS.pattern]: z
        .string()
        .meta({ description: "Valid ripgrep pattern to search for" }),
    });
  },
  name: "grep",
  outputSchema: z.object({
    hasErrors: z.boolean().optional().default(false),
    matches: z.array(
      z.object({
        lineNum: z.number(),
        lineText: z.string(),
        modifiedAt: z.number(),
        path: z.string(),
      }),
    ),
    totalMatches: z.number(),
    truncated: z.boolean(),
  }),
}).create({
  description: ({ agentName }) => {
    const pathExample =
      agentName === "retrieval" ? "/path/to/attached/folder" : "./src";

    return dedent`
      - Fast content search tool that uses ripgrep (rg) that works with any codebase size.
      - Searches file contents using regular expressions.
      - Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.).
      - Uses smart case by default: searches case insensitively if ${INPUT_PARAMS.pattern} is all lowercase, otherwise searches case sensitively.
      - Filter files by pattern with the ${INPUT_PARAMS.include} parameter (eg. "*.js", "*.{ts,tsx}").
      - Search in specific directories by providing a ${INPUT_PARAMS.path} parameter.
      - The ${INPUT_PARAMS.path} parameter must be ${agentName === "retrieval" ? "an absolute path within an attached folder" : "a relative path"}. E.g. ${pathExample}
      - Returns file paths with line numbers and content, sorted by modification time.
      - Use this tool when you need to find files containing specific patterns.
    `;
  },
  execute: async ({ agentName, appConfig, input, projectState, signal }) => {
    // For retrieval agents: validate absolute path and search from that path
    // For non-retrieval agents: resolve path and maintain relative paths in results
    if (agentName === "retrieval") {
      const pathResult = resolveAgentPath({
        agentName,
        appDir: appConfig.appDir,
        attachedFolders: projectState.attachedFolders,
        inputPath: input.path,
        isRequired: true,
      });

      if (pathResult.isErr()) {
        return err(pathResult.error);
      }

      const { absolutePath: searchPath } = pathResult.value;

      // Use appDir as cwd, pass absolute path as searchPath
      // This makes ripgrep return absolute paths in results
      const result = await grep({
        cwd: appConfig.appDir,
        include: input.include,
        limit: GREP_LIMIT,
        pattern: input.pattern,
        searchPath,
        signal,
      });

      return ok(result);
    }

    // Non-retrieval agent: search from appDir with optional relative searchPath
    if (input.path) {
      const pathResult = ensureRelativePath(input.path);
      if (pathResult.isErr()) {
        return err(pathResult.error);
      }
      const searchPath = pathResult.value;

      const result = await grep({
        cwd: appConfig.appDir,
        include: input.include,
        limit: GREP_LIMIT,
        pattern: input.pattern,
        searchPath,
        signal,
      });

      return ok(result);
    }

    // No path specified, search from root
    const result = await grep({
      cwd: appConfig.appDir,
      include: input.include,
      limit: GREP_LIMIT,
      pattern: input.pattern,
      searchPath: "./",
      signal,
    });

    return ok(result);
  },
  readOnly: true,
  timeoutMs: ms("30 seconds"),
  toModelOutput: ({ output }) => {
    if (output.matches.length === 0) {
      return {
        type: "error-text",
        value: "No matches found",
      };
    }

    // Sort by modification time (newest first)
    const sortedMatches = [...output.matches].sort(
      (a, b) => b.modifiedAt - a.modifiedAt,
    );

    const outputLines = [`Found ${output.matches.length} matches`];

    let currentFile = "";
    for (const match of sortedMatches) {
      if (currentFile !== match.path) {
        if (currentFile !== "") {
          outputLines.push("");
        }
        currentFile = match.path;
        outputLines.push(`${match.path}:`);
      }
      outputLines.push(`  Line ${match.lineNum}: ${match.lineText}`);
    }

    if (output.truncated) {
      outputLines.push(
        "",
        `(Results truncated: showing ${GREP_LIMIT} of ${output.totalMatches} matches (${output.totalMatches - GREP_LIMIT} hidden). Consider using a more specific path or pattern.)`,
      );
    }

    if (output.hasErrors) {
      outputLines.push("", "(Some paths were inaccessible and skipped)");
    }

    return {
      type: "text",
      value: outputLines.join("\n"),
    };
  },
});
