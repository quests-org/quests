import { glob } from "glob";
import ms from "ms";
import { ok } from "neverthrow";
import { alphabetical } from "radashi";
import { z } from "zod";

import { getIgnore } from "../lib/get-ignore";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

export const Glob = createTool({
  description: "Find files matching a glob pattern in the codebase",
  execute: async ({ appConfig, input }) => {
    const ignore = await getIgnore(appConfig.appDir);
    const files = await glob(input.pattern, {
      absolute: false,
      cwd: appConfig.appDir,
      ignore: {
        ignored: (p) => {
          return ignore.ignores(p.name);
        },
      },
      posix: true, // Use / path separators on Windows for consistency
    });

    return ok({ files: alphabetical(files, (f) => f) });
  },
  inputSchema: BaseInputSchema.extend({
    pattern: z
      .string()
      .meta({ description: "Glob pattern to match files against" }),
  }),
  name: "glob",
  outputSchema: z.object({
    files: z.array(z.string()),
  }),
  readOnly: true,
  timeoutMs: ms("5 seconds"),
  toModelOutput: ({ output }) => {
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
