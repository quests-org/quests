import { envForProviders } from "@quests/ai-gateway";
import ms from "ms";
import { err, ok, type Result } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import type { AppConfig } from "../lib/app-config/types";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { execaNodeForApp } from "../lib/execa-node-for-app";
import { filterDebuggerMessages } from "../lib/filter-debugger-messages";
import { fixRelativePath } from "../lib/fix-relative-path";
import { pathExists } from "../lib/path-exists";
import { runNodeModulesBin } from "../lib/run-node-modules-bin";
import { getWorkspaceServerURL } from "../logic/server/url";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";
import { translateShellCommand } from "./translate-shell-command";

const FileOperationSchema = z.enum(["cp", "mkdir", "mv", "rm"]);
type FileOperation = z.output<typeof FileOperationSchema>;

const ShellCommandSchema = z.enum(["pnpm", "tsc", "tsx"]);
type ShellCommand = z.output<typeof ShellCommandSchema>;

const CommandNameSchema = z.union([FileOperationSchema, ShellCommandSchema]);
type CommandName = z.output<typeof CommandNameSchema>;

const AVAILABLE_COMMANDS: Record<
  CommandName,
  { description: string; examples: string[]; isFileOperation: boolean }
> = {
  cp: {
    description:
      "A limited version of the cp command that supports the -r flag for recursive directory copying and can only copy files/directories in the app directory.",
    examples: [
      "cp src/file.ts src/file-copy.ts",
      "cp -r src/components src/components-backup",
    ],
    isFileOperation: true,
  },
  mkdir: {
    description:
      "A limited version of the mkdir command that supports the -p flag for recursive directory creation.",
    examples: ["mkdir src/utils", "mkdir -p src/components/ui/buttons"],
    isFileOperation: true,
  },
  mv: {
    description:
      "A limited version of the mv command that accepts no flags and can only move files in the app directory.",
    examples: ["mv src/old.ts src/new.ts"],
    isFileOperation: true,
  },
  pnpm: {
    description: "CLI tool for managing JavaScript packages.",
    examples: ["pnpm add <package-name>"],
    isFileOperation: false,
  },
  rm: {
    description:
      "A limited version of the rm command that supports the -r flag for recursive directory removal and can only remove files/directories in the app directory.",
    examples: ["rm src/temp.json", "rm -r build/"],
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

type FileOperationResult = Result<
  { command: string; exitCode: number; stderr: string; stdout: string },
  { message: string; type: "execute-error" }
>;

function createError(message: string): {
  message: string;
  type: "execute-error";
} {
  return { message, type: "execute-error" };
}

function createSuccess(command: string): {
  command: string;
  exitCode: number;
  stderr: string;
  stdout: string;
} {
  return { command, exitCode: 0, stderr: "", stdout: "" };
}

async function handleCpCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return err(
      createError(
        "cp command requires at least 2 arguments: cp [-r] <source> <destination>",
      ),
    );
  }

  let recursive = false;
  let sourcePath: string;
  let destPath: string;

  if (args[0] === "-r") {
    if (args.length !== 3) {
      return err(
        createError(
          "cp -r command requires exactly 2 path arguments: cp -r <source> <destination>",
        ),
      );
    }
    recursive = true;
    sourcePath = args[1] ?? "";
    destPath = args[2] ?? "";
  } else {
    if (args.length !== 2) {
      return err(
        createError(
          "cp command requires exactly 2 arguments: cp <source> <destination>",
        ),
      );
    }
    sourcePath = args[0] ?? "";
    destPath = args[1] ?? "";
  }

  if (!sourcePath || !destPath) {
    return err(
      createError(
        "cp command requires valid source and destination path arguments",
      ),
    );
  }

  const fixedSourceResult = validateAndFixPath(sourcePath, "Source");
  if (fixedSourceResult.isErr()) {
    return err(fixedSourceResult.error);
  }

  const fixedDestResult = validateAndFixPath(destPath, "Destination");
  if (fixedDestResult.isErr()) {
    return err(fixedDestResult.error);
  }

  const absoluteSourcePath = absolutePathJoin(
    appConfig.appDir,
    fixedSourceResult.value,
  );
  const absoluteDestPath = absolutePathJoin(
    appConfig.appDir,
    fixedDestResult.value,
  );

  const sourceExists = await pathExists(absoluteSourcePath);
  if (!sourceExists) {
    return err(
      createError(`cp: cannot stat '${sourcePath}': No such file or directory`),
    );
  }

  try {
    const stats = await fs.stat(absoluteSourcePath);

    if (stats.isDirectory()) {
      if (!recursive) {
        return err(
          createError(
            `cp: -r not specified; omitting directory '${sourcePath}'`,
          ),
        );
      }

      await fs.cp(absoluteSourcePath, absoluteDestPath, {
        force: true,
        recursive: true,
      });
      return ok(createSuccess(`cp -r ${sourcePath} ${destPath}`));
    } else {
      await fs.copyFile(absoluteSourcePath, absoluteDestPath);
      const command = recursive
        ? `cp -r ${sourcePath} ${destPath}`
        : `cp ${sourcePath} ${destPath}`;
      return ok(createSuccess(command));
    }
  } catch (error) {
    return err(
      createError(
        `cp command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
  }
}

async function handleFileOperation(
  command: FileOperation,
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  switch (command) {
    case "cp": {
      return handleCpCommand(args, appConfig);
    }
    case "mkdir": {
      return handleMkdirCommand(args, appConfig);
    }
    case "mv": {
      return handleMvCommand(args, appConfig);
    }
    case "rm": {
      return handleRmCommand(args, appConfig);
    }
  }
}

async function handleMkdirCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return err(
      createError(
        "mkdir command requires at least 1 argument: mkdir [-p] <directory>",
      ),
    );
  }

  let recursive = false;
  let directoryPath: string;

  // Check for -p flag
  if (args[0] === "-p") {
    recursive = true;
    if (args.length < 2 || !args[1]) {
      return err(
        createError(
          "mkdir command with -p flag requires a directory argument: mkdir -p <directory>",
        ),
      );
    }
    directoryPath = args[1];
  } else {
    if (args.length !== 1 || !args[0]) {
      return err(
        createError(
          "mkdir command requires exactly 1 argument: mkdir <directory>",
        ),
      );
    }
    directoryPath = args[0];
  }

  if (!directoryPath) {
    return err(createError("mkdir command requires a directory path"));
  }

  const fixedPathResult = validateAndFixPath(directoryPath, "Directory");
  if (fixedPathResult.isErr()) {
    return err(fixedPathResult.error);
  }

  const absolutePath = absolutePathJoin(
    appConfig.appDir,
    fixedPathResult.value,
  );

  try {
    await fs.mkdir(absolutePath, { recursive });
    const command = recursive
      ? `mkdir -p ${directoryPath}`
      : `mkdir ${directoryPath}`;
    return ok(createSuccess(command));
  } catch (error) {
    return err(
      createError(
        `mkdir command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
  }
}

async function handleMvCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  const argsResult = validateArgCount(
    "mv",
    args,
    2,
    "mv <source> <destination>",
  );
  if (argsResult.isErr()) {
    return err(argsResult.error);
  }

  const [sourcePath, destPath] = argsResult.value;

  if (!sourcePath || !destPath) {
    return err(
      createError(
        "mv command requires exactly 2 arguments: mv <source> <destination>",
      ),
    );
  }

  const fixedSourceResult = validateAndFixPath(sourcePath, "Source");
  if (fixedSourceResult.isErr()) {
    return err(fixedSourceResult.error);
  }

  const fixedDestResult = validateAndFixPath(destPath, "Destination");
  if (fixedDestResult.isErr()) {
    return err(fixedDestResult.error);
  }

  const absoluteSourcePath = absolutePathJoin(
    appConfig.appDir,
    fixedSourceResult.value,
  );
  const absoluteDestPath = absolutePathJoin(
    appConfig.appDir,
    fixedDestResult.value,
  );

  const sourceExists = await pathExists(absoluteSourcePath);
  if (!sourceExists) {
    return err(
      createError(`mv: cannot stat '${sourcePath}': No such file or directory`),
    );
  }

  const destDir = path.dirname(absoluteDestPath);
  try {
    await fs.access(destDir);
  } catch {
    return err(
      createError(
        `mv: cannot move '${sourcePath}' to '${destPath}': No such file or directory`,
      ),
    );
  }

  if (absoluteSourcePath === absoluteDestPath) {
    return ok(createSuccess(`mv ${sourcePath} ${destPath}`));
  }

  try {
    await fs.rename(absoluteSourcePath, absoluteDestPath);
    return ok(createSuccess(`mv ${sourcePath} ${destPath}`));
  } catch (error) {
    return err(
      createError(
        `mv command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
  }
}

async function handleRmCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return err(
      createError(
        "rm command requires at least 1 argument: rm [-r] <file|directory>",
      ),
    );
  }

  let recursive = false;
  let targetPath: string;

  // Parse flags and arguments
  if (args[0] === "-r") {
    if (args.length !== 2) {
      return err(
        createError(
          "rm -r command requires exactly 1 path argument: rm -r <directory>",
        ),
      );
    }
    recursive = true;
    targetPath = args[1] ?? "";
  } else {
    if (args.length !== 1) {
      return err(
        createError("rm command requires exactly 1 argument: rm <file>"),
      );
    }
    targetPath = args[0] ?? "";
  }

  if (!targetPath) {
    return err(createError("rm command requires a valid path argument"));
  }

  const fixedPathResult = validateAndFixPath(targetPath, "Path");
  if (fixedPathResult.isErr()) {
    return err(fixedPathResult.error);
  }

  const absolutePath = absolutePathJoin(
    appConfig.appDir,
    fixedPathResult.value,
  );

  const exists = await pathExists(absolutePath);
  if (!exists) {
    return err(
      createError(
        `rm: cannot remove '${targetPath}': No such file or directory`,
      ),
    );
  }

  try {
    const stats = await fs.stat(absolutePath);

    if (stats.isDirectory()) {
      if (!recursive) {
        return err(
          createError(`rm: cannot remove '${targetPath}': Is a directory`),
        );
      }

      // Recursive directory removal
      await fs.rm(absolutePath, { force: true, recursive: true });
      return ok(createSuccess(`rm -r ${targetPath}`));
    } else {
      // File removal
      await fs.unlink(absolutePath);
      const command = recursive ? `rm -r ${targetPath}` : `rm ${targetPath}`;
      return ok(createSuccess(command));
    }
  } catch (error) {
    return err(
      createError(
        `rm command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      ),
    );
  }
}

function validateAndFixPath(
  inputPath: string,
  pathType: string,
): Result<string, { message: string; type: "execute-error" }> {
  const fixedPath = fixRelativePath(inputPath);
  if (!fixedPath) {
    return err(createError(`${pathType} path is not relative: ${inputPath}`));
  }
  return ok(fixedPath);
}

function validateArgCount(
  command: string,
  args: string[],
  expectedCount: number,
  usage: string,
): Result<string[], { message: string; type: "execute-error" }> {
  if (args.length !== expectedCount) {
    return err(
      createError(
        `${command} command requires exactly ${expectedCount} argument${expectedCount > 1 ? "s" : ""}: ${usage}`,
      ),
    );
  }

  const nonEmptyArgs = args.filter(Boolean);
  if (nonEmptyArgs.length !== expectedCount) {
    return err(
      createError(
        `${command} command requires exactly ${expectedCount} argument${expectedCount > 1 ? "s" : ""}: ${usage}`,
      ),
    );
  }

  return ok(args);
}

export const RunShellCommand = createTool({
  description: dedent`
    Run commands in the app folder. All operations are scoped to the current directory.
      
    IMPORTANT: Only ONE command per invocation. Do not chain commands with &&, ||, ;, or |.
    If you need to run multiple commands, call this tool multiple times.
    Note: cd commands are not supported - all commands run in the app directory.
      
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
      return err({
        message: parseResult.error.message,
        type: "execute-error",
      });
    }

    const [commandName, ...args] = parseResult.value;

    if (!commandName) {
      return err({
        message: "No command name found when parsing command.",
        type: "execute-error",
      });
    }

    const commandValidation = CommandNameSchema.safeParse(commandName);
    if (!commandValidation.success) {
      const allCommands = [
        ...FileOperationSchema.options,
        ...ShellCommandSchema.options,
      ];
      return err({
        message: `Invalid command. The available commands are: ${allCommands.join(", ")}.`,
        type: "execute-error",
      });
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
          return err({
            message: `Quests already starts and runs the apps for you. You don't need to run 'pnpm ${subcommand}'.`,
            type: "execute-error",
          });
        }

        if (
          subcommand === "run" &&
          (secondArg === "dev" || secondArg === "start")
        ) {
          return err({
            message: `Quests already starts and runs the apps for you. You don't need to run 'pnpm run ${secondArg}'.`,
            type: "execute-error",
          });
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
          stdout: execResult.stdout,
        });
      }
      case "tsc": {
        const binResult = await runNodeModulesBin(appConfig, "tsc", args, {
          cancelSignal: signal,
        });
        if (binResult.isErr()) {
          return err({
            message: binResult.error.message,
            type: "execute-error",
          });
        }
        const execResult = await binResult.value;
        return ok({
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
          stderr: filterDebuggerMessages(execResult.stderr),
          stdout: execResult.stdout,
        });
      }
      case "tsx": {
        if (args.length === 0) {
          return err({
            message:
              "tsx command requires a file argument (e.g., tsx scripts/setup.ts). Running tsx without arguments spawns an interactive shell.",
            type: "execute-error",
          });
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
          return err({
            message: binResult.error.message,
            type: "execute-error",
          });
        }
        const execResult = await binResult.value;
        return ok({
          command: input.command,
          exitCode: execResult.exitCode ?? 0,
          stderr: filterDebuggerMessages(execResult.stderr),
          stdout: execResult.stdout,
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
