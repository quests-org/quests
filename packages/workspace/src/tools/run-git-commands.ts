import ms from "ms";
import { err, ok } from "neverthrow";
import { sift } from "radashi";
import { z } from "zod";

import { git } from "../lib/git";
import { truncateBuffer } from "../lib/truncate-buffer";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

const RunGitCommandsParamsSchema = BaseInputSchema.extend({
  commands: z
    .array(z.array(z.string()))
    .meta({ description: "Array of git command arguments to execute" }),
});

const MAX_OUTPUT_LENGTH = 700; // Roughly 500 tokens

export const RunGitCommands = createTool({
  description: "Run multiple git commands in sequence in the repo root",
  execute: async ({ appConfig, input, signal }) => {
    const results = [];

    for (const args of input.commands) {
      const result = await git(args, appConfig.appDir, { signal });
      if (result.isErr()) {
        return err({
          message: result.error.message,
          type: "execute-error",
        });
      }

      const stdout = truncateBuffer(result.value.stdout, MAX_OUTPUT_LENGTH);
      const stderr = truncateBuffer(result.value.stderr, MAX_OUTPUT_LENGTH);

      results.push({
        command: args.join(" "),
        exitCode: result.value.exitCode,
        stderr,
        stdout,
      });
    }

    return ok({ results });
  },
  inputSchema: RunGitCommandsParamsSchema,
  name: "run_git_commands",
  outputSchema: z.object({
    results: z.array(
      z.object({
        command: z.string(),
        exitCode: z.number(),
        stderr: z.string(),
        stdout: z.string(),
      }),
    ),
  }),
  readOnly: false,
  timeoutMs: ms("30 seconds"), // Git commands can be slow
  toModelOutput: ({ output }) => {
    const hasErrors = output.results.some(
      (cmdResult) => cmdResult.exitCode !== 0,
    );

    const commandOutputs = output.results.map((cmdResult) => {
      if (!hasErrors && !cmdResult.stdout && !cmdResult.stderr) {
        return `$ git ${cmdResult.command}`;
      }

      const content = sift([cmdResult.stdout, cmdResult.stderr]).join("\n");
      return `$ git ${cmdResult.command}\n${content}`;
    });

    return {
      type: hasErrors ? "error-text" : "text",
      value: commandOutputs.join("\n\n"),
    };
  },
});
