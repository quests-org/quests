import { parseCommandString } from "execa";
import ms from "ms";
import { err, ok, type Result } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { dedent } from "radashi";
import { z } from "zod";

import type { AppConfig } from "../lib/app-config/types";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { fixRelativePath } from "../lib/fix-relative-path";
import { pathExists } from "../lib/path-exists";
import { BaseInputSchema } from "./base";
import { createTool } from "./create-tool";

const AVAILABLE_COMMANDS = {
  mkdir: {
    description:
      "A limited version of the mkdir command that supports the -p flag for creating parent directories.",
    example: "mkdir -p src/components/ui",
    isFileOperation: true,
  },
  mv: {
    description:
      "A limited version of the mv command that accepts no flags and can only move files in the app directory.",
    example: "mv src/old.ts src/new.ts",
    isFileOperation: true,
  },
  pnpm: {
    description: "Node.js package manager",
    example: "pnpm add <package-name>",
    isFileOperation: false,
  },
  rm: {
    description:
      "A limited version of the rm command that supports the -r flag for recursive directory removal and can only remove files/directories in the app directory.",
    example: "rm temp/cache.json or rm -r temp/",
    isFileOperation: true,
  },
} as const;

const SHELL_COMMANDS = new Set(
  Object.entries(AVAILABLE_COMMANDS)
    .filter(([, config]) => !config.isFileOperation)
    .map(([command]) => command),
);

const FILE_OPERATIONS = new Set(
  Object.entries(AVAILABLE_COMMANDS)
    .filter(([, config]) => config.isFileOperation)
    .map(([command]) => command),
);

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

async function handleFileOperation(
  command: string,
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  switch (command) {
    case "mkdir": {
      return handleMkdirCommand(args, appConfig);
    }
    case "mv": {
      return handleMvCommand(args, appConfig);
    }
    case "rm": {
      return handleRmCommand(args, appConfig);
    }
    default: {
      return err(createError(`Unknown file operation: ${command}`));
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
        `mkdir: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        `mv: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        `rm: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      
    Available commands:
    ${Object.entries(AVAILABLE_COMMANDS)
      .map(([command, config]) => `- ${command} - ${config.description}`)
      .join("\n")}
      
    Examples:
    ${Object.entries(AVAILABLE_COMMANDS)
      .map(([, config]) => `- ${config.example}`)
      .join("\n")}
    
    File operations (${Object.entries(AVAILABLE_COMMANDS)
      .filter(([, config]) => config.isFileOperation)
      .map(([command]) => command)
      .join(", ")}) use secure Node.js APIs instead of shell execution.
  `,
  execute: async ({ appConfig, input, signal }) => {
    const parsedCommand = parseCommandString(input.command);
    const [commandName, ...args] = parsedCommand;

    if (!commandName) {
      return err({
        message: "No command name found when parsing command.",
        type: "execute-error",
      });
    }

    // Handle file operations with Node.js
    if (FILE_OPERATIONS.has(commandName)) {
      return await handleFileOperation(commandName, args, appConfig);
    }

    // Handle allowed shell commands
    if (!SHELL_COMMANDS.has(commandName)) {
      return err({
        message: `Invalid command. The available commands are: ${Object.keys(AVAILABLE_COMMANDS).join(", ")}.`,
        type: "execute-error",
      });
    }

    const safeResult = await appConfig.workspaceConfig.runShellCommand(
      input.command,
      { cwd: appConfig.appDir, signal },
    );
    if (safeResult.isErr()) {
      return err({
        message: safeResult.error.message,
        type: "execute-error",
      });
    }
    const result = await safeResult.value;

    return ok({
      command: input.command,
      exitCode: result.exitCode ?? 0,
      stderr: result.stderr,
      stdout: result.stdout,
    });
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

    const output = outputParts.join("\n");

    return {
      type: hasErrors ? "error-text" : "text",
      value: [`$ ${result.command}`, output].join("\n"),
    };
  },
});
