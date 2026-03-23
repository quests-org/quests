import ms from "ms";
import { ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import { createBashEnv } from "../lib/create-bash-env";
import { PNPM_COMMAND, TS_COMMAND, TSC_COMMAND } from "../lib/shell-commands";
import { BaseInputSchema } from "./base";
import { setupTool } from "./create-tool";

const MAX_OUTPUT_LENGTH = 30_000;

export const BashTool = setupTool({
  inputSchema: BaseInputSchema.extend({
    command: z.string().meta({ description: "The bash command to run" }),
    timeoutMs: z.number().optional().default(ms("30 seconds")).meta({
      description: "The timeout in milliseconds for the command",
    }),
  }),
  name: "bash",
  outputSchema: z.object({
    command: z.string(),
    commands: z.array(z.string()),
    exitCode: z.number(),
    stderr: z.string(),
    stdout: z.string(),
  }),
}).create({
  description: dedent`
		Run bash commands in the project directory. Full bash syntax is supported including
		pipes (|), redirections (>, >>), chaining (&&, ||, ;), variables, loops, and scripts.

		IMPORTANT: This is a sandboxed environment. node, npm, python, and other runtimes are
		NOT available. Do NOT attempt to run them. Only use the commands listed below.

		Built-in commands: cat, head, tail, wc, sort, uniq, diff, find, sed, awk, tr, cut,
		xargs, tee, cp, mv, rm, mkdir, ls, chmod, and many more standard Unix utilities.

		Custom commands: ${PNPM_COMMAND.name} (package manager), ${TS_COMMAND.name}/${TS_COMMAND.alias} (run TypeScript),
		${TSC_COMMAND.name} (type check).

		Examples:
		- cat package.json | grep "dependencies"
		- find src -name "*.ts" | wc -l
		- ${PNPM_COMMAND.name} install && ${TS_COMMAND.name} scripts/seed.ts
		- for f in src/*.ts; do wc -l "$f"; done
		- diff <(cat file1.txt) <(cat file2.txt)
	`,
  execute: async ({ appConfig, input, signal }) => {
    const bash = createBashEnv(appConfig);
    const result = await bash.exec(input.command, { signal });

    const commands = Array.isArray(result.metadata?.commands)
      ? result.metadata.commands
      : [];

    return ok({
      command: input.command,
      commands,
      exitCode: result.exitCode,
      stderr: result.stderr,
      stdout: result.stdout,
    });
  },
  readOnly: false,
  timeoutMs: ({ input }) => input.timeoutMs,
  toModelOutput: ({ output }) => {
    const hasErrors = output.exitCode !== 0;
    const combined = [output.stdout, output.stderr].filter(Boolean).join("\n");
    let displayOutput = combined;

    if (displayOutput.length > MAX_OUTPUT_LENGTH) {
      displayOutput =
        displayOutput.slice(0, MAX_OUTPUT_LENGTH) +
        `\n... (truncated ${displayOutput.length - MAX_OUTPUT_LENGTH} characters)`;
    }

    if (!hasErrors && !displayOutput) {
      return { type: "text", value: `$ ${output.command}` };
    }

    const outputParts: string[] = [];
    if (displayOutput) {
      outputParts.push(displayOutput);
    }

    if (
      displayOutput.includes("Ignored build scripts:") &&
      displayOutput.includes("Warning")
    ) {
      outputParts.push(
        dedent`

					<quests-system-note>
					This warning means some packages were not built during installation.
					If you encounter "Cannot find module" errors or the package doesn't work:

					1. Read pnpm-workspace.yaml from the workspace root.
					2. Add the package names from the warning to the \`allowBuilds\` mapping.
					\`\`\`yaml
					allowBuilds:
					  esbuild: true
					  sharp: true
					\`\`\`
					3. Run \`${PNPM_COMMAND.name} rebuild <package-name>\` for each package you added.

					All three steps are required. Running rebuild without first modifying pnpm-workspace.yaml will not fix the issue.
					</quests-system-note>
				`,
      );
    }

    if (
      hasErrors &&
      (displayOutput.includes("Cannot find module") ||
        displayOutput.includes("Cannot find package") ||
        displayOutput.includes("ERR_MODULE_NOT_FOUND"))
    ) {
      outputParts.push(
        dedent`

					<quests-system-note>
					This error indicates a required module is missing. You may need to install dependencies by running:
					\`${PNPM_COMMAND.name} install\`
					</quests-system-note>
				`,
      );
    }

    const finalOutput = outputParts.join("\n");

    return {
      type: hasErrors ? "error-text" : "text",
      value: [`$ ${output.command}`, finalOutput].join("\n"),
    };
  },
});
