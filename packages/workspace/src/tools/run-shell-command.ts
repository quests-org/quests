import ms from "ms";
import { dedent } from "radashi";
import { z } from "zod";

import type { AppConfig } from "../lib/app-config/types";

import { executeError } from "../lib/execute-error";
import {
  CP_COMMAND,
  cpCommand,
  type FileOperationResult,
  LS_COMMAND,
  lsCommand,
  MKDIR_COMMAND,
  mkdirCommand,
  MV_COMMAND,
  mvCommand,
  PNPM_COMMAND,
  pnpmCommand,
  RM_COMMAND,
  rmCommand,
  TS_COMMAND,
  TSC_COMMAND,
  tscCommand,
  tsCommand,
} from "../lib/shell-commands";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { translateShellCommand } from "./translate-shell-command";

const FileOperationSchema = z.enum([
  CP_COMMAND.name,
  LS_COMMAND.name,
  MKDIR_COMMAND.name,
  MV_COMMAND.name,
  RM_COMMAND.name,
]);
type FileOperation = z.output<typeof FileOperationSchema>;

const ShellCommandSchema = z.enum([
  PNPM_COMMAND.name,
  TSC_COMMAND.name,
  TS_COMMAND.name,
]);
type ShellCommand = z.output<typeof ShellCommandSchema>;

const CommandNameSchema = z.union([FileOperationSchema, ShellCommandSchema]);

const AVAILABLE_COMMANDS: Record<
  FileOperation | ShellCommand,
  {
    description: string;
    examples: readonly string[];
    hidden?: boolean;
    isFileOperation: boolean;
  }
> = {
  [CP_COMMAND.name]: {
    ...CP_COMMAND,
    isFileOperation: true,
  },
  [LS_COMMAND.name]: {
    ...LS_COMMAND,
    isFileOperation: true,
  },
  [MKDIR_COMMAND.name]: {
    ...MKDIR_COMMAND,
    isFileOperation: true,
  },
  [MV_COMMAND.name]: {
    ...MV_COMMAND,
    isFileOperation: true,
  },
  [PNPM_COMMAND.name]: {
    ...PNPM_COMMAND,
    isFileOperation: false,
  },
  [RM_COMMAND.name]: {
    ...RM_COMMAND,
    isFileOperation: true,
  },
  [TS_COMMAND.name]: {
    ...TS_COMMAND,
    isFileOperation: false,
  },
  [TSC_COMMAND.name]: {
    ...TSC_COMMAND,
    // Hidden because the diagnostics tool should suffice and don't want agent
    // to think it needs to compile scripts to run them
    hidden: true,
    isFileOperation: false,
  },
};

const VISIBLE_COMMANDS = Object.entries(AVAILABLE_COMMANDS).filter(
  ([, config]) => !config.hidden,
);

async function handleFileOperation(
  command: FileOperation,
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  switch (command) {
    case CP_COMMAND.name: {
      return cpCommand(args, appConfig);
    }
    case LS_COMMAND.name: {
      return lsCommand(args, appConfig);
    }
    case MKDIR_COMMAND.name: {
      return mkdirCommand(args, appConfig);
    }
    case MV_COMMAND.name: {
      return mvCommand(args, appConfig);
    }
    case RM_COMMAND.name: {
      return rmCommand(args, appConfig);
    }
  }
}

export const RunShellCommand = createTool({
  description: dedent`
    Execute whitelisted commands. Only these commands: ${VISIBLE_COMMANDS.map(([command]) => command).join(", ")}
    
    CONSTRAINTS:
    - One command per call (no &&, ||, ;, |, >, <)
    - No glob patterns (*, ?, [], {})
    - Paths relative to project root
    
    ${VISIBLE_COMMANDS.map(([command, config]) => `${command}: ${config.description}`).join("\n")}
      
    Examples: ${VISIBLE_COMMANDS.flatMap(([, config]) => config.examples).join(", ")}
  `,
  execute: async ({ appConfig, input, signal }) => {
    const parseResult = translateShellCommand(input.command);
    if (parseResult.isErr()) {
      return executeError(parseResult.error.message);
    }

    const [commandName, ...args] = parseResult.value;

    if (!commandName) {
      return executeError("No command name found when parsing command.");
    }

    const commandValidation = CommandNameSchema.safeParse(commandName);
    if (!commandValidation.success) {
      const allCommands = [
        ...FileOperationSchema.options,
        ...ShellCommandSchema.options,
      ];
      return executeError(
        `Invalid command. The available commands are: ${allCommands.join(", ")}.`,
      );
    }

    const validCommand = commandValidation.data;

    // Handle file operations with Node.js
    const fileOpValidation = FileOperationSchema.safeParse(validCommand);
    if (fileOpValidation.success) {
      return await handleFileOperation(fileOpValidation.data, args, appConfig);
    }

    const shellCommand = ShellCommandSchema.parse(validCommand);

    switch (shellCommand) {
      case PNPM_COMMAND.name: {
        return await pnpmCommand(args, appConfig, signal);
      }
      case TS_COMMAND.name: {
        return await tsCommand(args, appConfig, signal);
      }
      case TSC_COMMAND.name: {
        return await tscCommand(args, appConfig, signal);
      }
    }
  },
  inputSchema: BaseInputSchema.extend({
    command: z.string().meta({ description: "The shell command to run" }),
    timeoutMs: z.number().optional().default(ms("15 seconds")).meta({
      description: "The timeout in milliseconds for the shell command",
    }),
  }),
  name: "run_shell_command",
  outputSchema: z.object({
    combined: z.string().optional(), // Optional for backward compatibility
    command: z.string(),
    exitCode: z.number(),
    stderr: z.string().optional(), // Backward compatibility with old output format
    stdout: z.string().optional(), // Backward compatibility with old output format
  }),
  readOnly: false,
  timeoutMs: ({ input }) => input.timeoutMs,
  toModelOutput: ({ output: result }) => {
    // For backward compatibility, construct output from stderr and stdout if needed
    const output =
      result.combined ??
      (result.stderr && result.stdout
        ? `${result.stdout}${result.stderr}`
        : (result.stderr ?? result.stdout));
    const hasErrors = result.exitCode !== 0;

    if (!hasErrors && !output) {
      return {
        type: "text",
        value: `$ ${result.command}`,
      };
    }

    const outputParts: string[] = [];
    if (output) {
      outputParts.push(output);
    }

    const isPnpmCommand = result.command.startsWith(`${PNPM_COMMAND.name} `);
    const hasIgnoredBuildScriptsWarning =
      output &&
      output.includes("Ignored build scripts:") &&
      output.includes("Warning");

    if (isPnpmCommand && hasIgnoredBuildScriptsWarning) {
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

    const finalOutput = outputParts.join("\n");

    return {
      type: hasErrors ? "error-text" : "text",
      value: [`$ ${result.command}`, finalOutput].join("\n"),
    };
  },
});
