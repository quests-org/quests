import { envForProviders } from "@quests/ai-gateway";
import ms from "ms";
import { ok } from "neverthrow";
import { dedent } from "radashi";
import { z } from "zod";

import type { AppConfig } from "../lib/app-config/types";

import { execaNodeForApp } from "../lib/execa-node-for-app";
import { executeError } from "../lib/execute-error";
import { filterDebuggerMessages } from "../lib/filter-debugger-messages";
import { runNodeModulesBin } from "../lib/run-node-modules-bin";
import {
  cpCommand,
  type FileOperationResult,
  lsCommand,
  mkdirCommand,
  mvCommand,
  rmCommand,
} from "../lib/shell-commands";
import { getWorkspaceServerURL } from "../logic/server/url";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { translateShellCommand } from "./translate-shell-command";

const FileOperationSchema = z.enum(["cp", "ls", "mkdir", "mv", "rm"]);
type FileOperation = z.output<typeof FileOperationSchema>;

const ShellCommandSchema = z.enum(["pnpm", "tsc", "tsx"]);
type ShellCommand = z.output<typeof ShellCommandSchema>;

const CommandNameSchema = z.union([FileOperationSchema, ShellCommandSchema]);

const AVAILABLE_COMMANDS: Record<
  FileOperation | ShellCommand,
  { description: string; examples: string[]; isFileOperation: boolean }
> = {
  cp: {
    description:
      "A limited version of the cp command that supports the -r flag for recursive directory copying. Supports multiple sources when destination is a directory.",
    examples: [
      "cp src/file.ts src/file-copy.ts",
      "cp -r src/components src/components-backup",
      "cp file1.txt file2.txt file3.txt dest-dir/",
    ],
    isFileOperation: true,
  },
  ls: {
    description:
      "A limited version of the ls command that lists directory contents. Supports the -a flag to show hidden files. Unknown flags will be ignored with a warning.",
    examples: ["ls", "ls src", "ls -a src/components"],
    isFileOperation: true,
  },
  mkdir: {
    description:
      "A limited version of the mkdir command that supports the -p flag for recursive directory creation.",
    examples: [
      "mkdir src/utils",
      "mkdir -p src/components/ui/buttons",
      "mkdir folder1 folder2",
    ],
    isFileOperation: true,
  },
  mv: {
    description:
      "A limited version of the mv command that accepts no flags. Supports multiple sources when destination is a directory.",
    examples: [
      "mv src/old.ts src/new.ts",
      "mv file1.txt file2.txt file3.txt dest-dir/",
    ],
    isFileOperation: true,
  },
  pnpm: {
    description: "CLI tool for managing JavaScript packages.",
    examples: ["pnpm add <package-name>"],
    isFileOperation: false,
  },
  rm: {
    description:
      "A limited version of the rm command that supports the -r flag for recursive directory removal and -f flag to ignore nonexistent files. Supports multiple paths as arguments.",
    examples: [
      "rm src/temp.json",
      "rm -r build/",
      "rm file1.txt file2.txt file3.txt",
      "rm -rf dist/ build/",
    ],
    isFileOperation: true,
  },
  tsc: {
    description: "TypeScript compiler",
    examples: ["tsc"],
    isFileOperation: false,
  },
  tsx: {
    description:
      "Execute TypeScript files directly. Avoid -e string evaluation except for short one-liners like math, formatting, simple file operations, etc.",
    examples: [
      "tsx scripts/setup.ts",
      'tsx -e "console.log(Math.floor(Date.now() / 1000))"',
    ],
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
          { cancelSignal: signal },
        );
        return ok({
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
          stderr: filterDebuggerMessages(execResult.stderr),
          stdout: filterDebuggerMessages(execResult.stdout),
        });
      }
      case "tsc": {
        const binResult = await runNodeModulesBin(appConfig, "tsc", args, {
          cancelSignal: signal,
        });
        if (binResult.isErr()) {
          return executeError(binResult.error.message);
        }
        const execResult = await binResult.value;
        return ok({
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
          stderr: filterDebuggerMessages(execResult.stderr),
          stdout: filterDebuggerMessages(execResult.stdout),
        });
      }
      case "tsx": {
        if (args.length === 0) {
          return executeError(
            "tsx command requires a file argument (e.g., tsx scripts/setup.ts). Running tsx without arguments spawns an interactive shell.",
          );
        }
        const providerEnv = envForProviders({
          configs: appConfig.workspaceConfig.getAIProviderConfigs(),
          workspaceServerURL: getWorkspaceServerURL(),
        });
        const binResult = await runNodeModulesBin(appConfig, "tsx", args, {
          cancelSignal: signal,
          env: providerEnv,
        });
        if (binResult.isErr()) {
          return executeError(binResult.error.message);
        }
        const execResult = await binResult.value;
        return ok({
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
          stderr: filterDebuggerMessages(execResult.stderr),
          stdout: filterDebuggerMessages(execResult.stdout),
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
    command: z.string(),
    exitCode: z.number(),
    stderr: z.string(),
    stdout: z.string(),
  }),
  readOnly: false,
  timeoutMs: ({ input }) => input.timeoutMs,
  toModelOutput: ({ output: result }) => {
    const hasErrors = result.exitCode !== 0;

    if (!hasErrors && !result.stdout && !result.stderr) {
      return {
        type: "text",
        value: `$ ${result.command}`,
      };
    }

    const outputParts = [];

    if (result.stdout) {
      outputParts.push(`<stdout>`, result.stdout, `</stdout>`);
    }

    if (result.stderr) {
      outputParts.push(`<stderr>`, result.stderr, `</stderr>`);
    }

    const isPnpmCommand = result.command.startsWith("pnpm ");
    const hasIgnoredBuildScriptsWarning =
      result.stdout.includes("Ignored build scripts:") &&
      result.stdout.includes("Warning");

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

    const output = outputParts.join("\n");

    return {
      type: hasErrors ? "error-text" : "text",
      value: [`$ ${result.command}`, output].join("\n"),
    };
  },
});
