import { ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import { runDiagnostics } from "../lib/run-diagnostics";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

export const RunDiagnostics = createTool({
  description: dedent`
    Run diagnostics and display linter/compiler errors from the current workspace.

    - This tool runs project-wide diagnostics using TypeScript compiler
    - It returns all linting and type checking errors across the entire project
    - This tool can return linter errors that were already present before your edits, so avoid calling it with a very wide scope of files
    - NEVER call this tool on a file unless you've edited it or are about to edit it
  `,
  execute: async ({ appConfig, signal }) => {
    const diagnosticsOutput = await runDiagnostics(appConfig, { signal });

    // Split diagnostics output into individual error lines
    const errors = diagnosticsOutput
      ? diagnosticsOutput.split("\n").filter((line) => line.trim())
      : [];

    return ok({
      diagnostics: diagnosticsOutput || "No diagnostic errors found.",
      errors,
    });
  },
  inputSchema: BaseInputSchema,
  name: "run_diagnostics",
  outputSchema: z.object({
    diagnostics: z.string(),
    errors: z.array(z.string()),
  }),
  readOnly: true,
  timeoutMs: 15_000, // Diagnostics can take time
  toModelOutput: ({ output }) => {
    return {
      type: "text",
      value: output.diagnostics,
    };
  },
});
