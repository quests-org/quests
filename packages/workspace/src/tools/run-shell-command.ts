import { envForProviders } from "@quests/ai-gateway";
import ms from "ms";
import { ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import type { AppConfig } from "../lib/app-config/types";

import { execaNodeForApp } from "../lib/execa-node-for-app";
import { executeError } from "../lib/execute-error";
import { filterShellOutput } from "../lib/filter-shell-output";
import { runNodeModulesBin } from "../lib/run-node-modules-bin";
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
  RM_COMMAND,
  rmCommand,
} from "../lib/shell-commands";
import { getWorkspaceServerURL } from "../logic/server/url";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { translateShellCommand } from "./translate-shell-command";

export const TSX_COMMAND = {
  description: "Execute TypeScript files directly.",
  examples: ["tsx scripts/setup.ts"],
  name: "tsx" as const,
} as const;

const FileOperationSchema = z.enum(["cp", "ls", "mkdir", "mv", "rm"]);
type FileOperation = z.output<typeof FileOperationSchema>;

const ShellCommandSchema = z.enum(["pnpm", "tsc", TSX_COMMAND.name]);
type ShellCommand = z.output<typeof ShellCommandSchema>;

const CommandNameSchema = z.union([FileOperationSchema, ShellCommandSchema]);

const AVAILABLE_COMMANDS: Record<
  FileOperation | ShellCommand,
  { description: string; examples: readonly string[]; isFileOperation: boolean }
> = {
  cp: {
    ...CP_COMMAND,
    isFileOperation: true,
  },
  ls: {
    ...LS_COMMAND,
    isFileOperation: true,
  },
  mkdir: {
    ...MKDIR_COMMAND,
    isFileOperation: true,
  },
  mv: {
    ...MV_COMMAND,
    isFileOperation: true,
  },
  pnpm: {
    description: "CLI tool for managing JavaScript packages.",
    examples: ["pnpm add <package-name>"],
    isFileOperation: false,
  },
  rm: {
    ...RM_COMMAND,
    isFileOperation: true,
  },
  tsc: {
    description: "TypeScript compiler",
    examples: ["tsc"],
    isFileOperation: false,
  },
  [TSX_COMMAND.name]: {
    description: TSX_COMMAND.description,
    examples: TSX_COMMAND.examples,
    isFileOperation: false,
  },
};

async function handleFileOperation(
  command: FileOperation,
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  switch (command) {
    case "cp": {
      return cpCommand(args, appConfig);
    }
    case "ls": {
      return lsCommand(args, appConfig);
    }
    case "mkdir": {
      return mkdirCommand(args, appConfig);
    }
    case "mv": {
      return mvCommand(args, appConfig);
    }
    case "rm": {
      return rmCommand(args, appConfig);
    }
  }
}

export const RunShellCommand = createTool({
  description: dedent`
    Execute specific whitelisted commands in the project folder. This is NOT a general shell.
    
    All commands operate in the project directory by default. All paths must be relative to the project root.
    
    CONSTRAINTS:
    - Only ONE command per invocation
    - NO shell operators: no &&, ||, ;, |, >, <, 2>&1
    - NO command chaining or piping
    - NO cd commands (all run in project directory)
    - NO glob patterns: no *, ?, [], {}, etc. - specify exact file/directory names
    - Only these exact commands are allowed: ${Object.keys(AVAILABLE_COMMANDS).join(", ")}
    
    If you need multiple operations, call this tool multiple times.
    
    Available commands:
    ${Object.entries(AVAILABLE_COMMANDS)
      .map(([command, config]) => `- ${command} - ${config.description}`)
      .join("\n")}
      
    Examples:
    ${Object.entries(AVAILABLE_COMMANDS)
      .flatMap(([, config]) => config.examples.map((ex) => `- ${ex}`))
      .join("\n")}
    
    File operations (${Object.entries(AVAILABLE_COMMANDS)
      .filter(([, config]) => config.isFileOperation)
      .map(([command]) => command)
      .join(", ")}) use secure Node.js APIs instead of shell execution.
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

    // At this point, TypeScript knows validCommand is a ShellCommand
    const shellCommand = validCommand as ShellCommand;

    // Handle allowed shell commands
    switch (shellCommand) {
      case "pnpm": {
        const subcommand = args[0];
        const secondArg = args[1];

        if (subcommand === "dev" || subcommand === "start") {
          return executeError(
            `Quests already starts and runs the apps for you. You don't need to run 'pnpm ${subcommand}'.`,
          );
        }

        if (
          subcommand === "run" &&
          (secondArg === "dev" || secondArg === "start")
        ) {
          return executeError(
            `Quests already starts and runs the apps for you. You don't need to run 'pnpm run ${secondArg}'.`,
          );
        }

        const execResult = await execaNodeForApp(
          appConfig,
          appConfig.workspaceConfig.pnpmBinPath,
          args,
          { all: true, cancelSignal: signal },
        );
        const combined = filterShellOutput(execResult.all, appConfig.appDir);
        return ok({
          combined,
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
        });
      }
      case "tsc": {
        const binResult = await runNodeModulesBin(appConfig, "tsc", args, {
          all: true,
          cancelSignal: signal,
        });
        if (binResult.isErr()) {
          return executeError(binResult.error.message);
        }
        const execResult = await binResult.value;
        const combined = filterShellOutput(execResult.all, appConfig.appDir);
        return ok({
          combined,
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
        });
      }
      case TSX_COMMAND.name: {
        if (args.length === 0) {
          return executeError(
            `${TSX_COMMAND.name} command requires a file argument (e.g., ${TSX_COMMAND.name} scripts/setup.ts). Running ${TSX_COMMAND.name} without arguments spawns an interactive shell.`,
          );
        }
        const providerEnv = envForProviders({
          configs: appConfig.workspaceConfig.getAIProviderConfigs(),
          workspaceServerURL: getWorkspaceServerURL(),
        });
        // Use pnpm dlx for faster execution via cached packages and avoid
        // installing all packages eagerly.
        const execResult = await execaNodeForApp(
          appConfig,
          appConfig.workspaceConfig.pnpmBinPath,
          // Actually uses jiti, but called tsx to be more familiar to the agent
          ["dlx", "jiti", ...args],
          { all: true, cancelSignal: signal, env: providerEnv },
        );
        const combined = filterShellOutput(execResult.all, appConfig.appDir);
        return ok({
          combined,
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
        });
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

    const isPnpmCommand = result.command.startsWith("pnpm ");
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
          3. Run \`pnpm rebuild <package-name>\` for each package you added.
          
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
