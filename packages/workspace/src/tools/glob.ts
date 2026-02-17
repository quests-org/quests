import { glob } from "glob";
import ms from "ms";
import { ok } from "neverthrow";
import { alphabetical } from "radashi";
import { z } from "zod";

import { getIgnore } from "../lib/get-ignore";
import { resolveAgentPath } from "../lib/resolve-agent-path";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

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
          "Relative or absolute path to a folder to search within. Defaults to the current folder if not specified.",
      }),
    });
  },
  name: "glob",
  outputSchema: z.object({
    error: z.string().optional(),
    files: z.array(z.string()),
  }),
}).create({
  description: (agentName) => {
    if (agentName === "retrieval") {
      return "Find files matching a glob pattern within attached folders. You must specify an absolute path to an attached folder to search within.";
    }
    return "Find files matching a glob pattern in the codebase. Specify a path to search within a specific folder, or omit to search the current folder.";
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
      });
    }

    const { absolutePath: searchRoot } = pathResult.value;
    const ignore = await getIgnore(searchRoot);
    const files = await glob(input.pattern, {
      absolute: agentName === "retrieval",
      cwd: searchRoot,
      ignore: {
        ignored: (p) => {
          return ignore.ignores(p.name);
        },
      },
      posix: true, // Use / path separators on Windows for consistency
    });

    return ok({ files: alphabetical(files, (f) => f) });
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
    return {
      type: "text",
      value: output.files.join("\n"),
    };
  },
});
