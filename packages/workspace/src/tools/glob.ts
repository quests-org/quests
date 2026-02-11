import { glob } from "glob";
import ms from "ms";
import { ok } from "neverthrow";
import { alphabetical } from "radashi";
import { z } from "zod";

import { getIgnore } from "../lib/get-ignore";
import { validateAttachedFolderPath } from "../lib/validate-attached-folder-path";
import { type AbsolutePath } from "../schemas/paths";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

// Input schema must be defined at the top to allow for inference of functions below
/* eslint-disable perfectionist/sort-objects */
export const Glob = createTool({
  inputSchema: (agentName) =>
    BaseInputSchema.extend({
      pattern: z
        .string()
        .meta({ description: "Glob pattern to match files against" }),
      ...(agentName === "retrieval"
        ? {
            rootPath: z.string().meta({
              description:
                "Absolute path to an attached folder to search within",
            }),
          }
        : {}),
    }),
  description: (agentName) => {
    if (agentName === "retrieval") {
      return "Find files matching a glob pattern within attached folders. You must specify a rootPath parameter with the absolute path to an attached folder to search within.";
    }
    return "Find files matching a glob pattern in the codebase";
  },
  execute: async ({ agentName, appConfig, input, projectState }) => {
    let searchRoot: AbsolutePath;

    if (agentName === "retrieval" && projectState.attachedFolders) {
      // Retrieval agent requires explicit root path
      if (!input.rootPath) {
        const folderList = Object.values(projectState.attachedFolders)
          .map((f) => `  - ${f.name}: ${f.path}`)
          .join("\n");
        return ok({
          error: `Retrieval agent must specify a rootPath parameter. Available folders:\n${folderList}`,
          files: [],
        });
      }

      const pathResult = validateAttachedFolderPath(
        input.rootPath,
        projectState.attachedFolders,
      );
      if (pathResult.isErr()) {
        return ok({
          error: pathResult.error.message,
          files: [],
        });
      }
      searchRoot = pathResult.value;
    } else {
      searchRoot = appConfig.appDir;
    }

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
  name: "glob",
  outputSchema: z.object({
    error: z.string().optional(),
    files: z.array(z.string()),
  }),
  readOnly: true,
  timeoutMs: ms("5 seconds"),
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

/* eslint-enable perfectionist/sort-objects */
