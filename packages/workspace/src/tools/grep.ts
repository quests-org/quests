import ms from "ms";
import { err, ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import { fixRelativePath } from "../lib/fix-relative-path";
import { grep } from "../lib/grep";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

const INPUT_PARAMS = {
  include: "include",
  path: "path",
  pattern: "pattern",
} as const;

export const Grep = createTool({
  description: dedent`
    - Fast content search tool that uses ripgrep (rg) that works with any codebase size.
    - Searches file contents using regular expressions.
    - Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.).
    - Uses smart case by default: searches case insensitively if ${INPUT_PARAMS.pattern} is all lowercase, otherwise searches case sensitively.
    - Filter files by pattern with the ${INPUT_PARAMS.include} parameter (eg. "*.js", "*.{ts,tsx}").
    - Search in specific directories by providing a ${INPUT_PARAMS.path} parameter.
    - The ${INPUT_PARAMS.path} parameter must be a relative path. E.g. ./src
    - Returns file paths with line numbers and content, sorted by modification time.
    - Use this tool when you need to find files containing specific patterns.
  `,
  execute: async ({ appConfig, input, signal }) => {
    let searchPath = "./";

    // Handle optional path parameter
    if (input.path) {
      const fixedPath = fixRelativePath(input.path);
      if (!fixedPath) {
        return err({
          message: `Path is not relative: ${input.path}`,
          type: "execute-error",
        });
      }
      searchPath = fixedPath;
    }

    const result = await grep(appConfig.appDir, input.pattern, {
      include: input.include,
      searchPath,
      signal,
    });

    return ok(result);
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.include]: z.string().optional().meta({
      description:
        'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
    }),
    [INPUT_PARAMS.path]: z.string().optional().meta({
      description:
        "The directory to search in (relative to project root). Defaults to current directory.",
    }),
    [INPUT_PARAMS.pattern]: z
      .string()
      .meta({ description: "Valid ripgrep pattern to search for" }),
  }),
  name: "grep",
  outputSchema: z.object({
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
  readOnly: true,
  timeoutMs: ms("5 seconds"),
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
        "(Results are truncated. Consider using a more specific path or pattern.)",
      );
    }

    return {
      type: "text",
      value: outputLines.join("\n"),
    };
  },
});
