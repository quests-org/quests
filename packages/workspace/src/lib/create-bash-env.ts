import { envForProviderConfigs } from "@quests/ai-gateway";
import {
  Bash,
  type CommandName,
  type CommandNode,
  defineCommand,
  getCommandNames,
  ReadWriteFs,
  type ScriptNode,
  type StatementNode,
  type TransformPlugin,
} from "just-bash";

import type { AppConfig } from "./app-config/types";

import { getWorkspaceServerURL } from "../logic/server/url";
import { createFfmpegCommand, FFMPEG_COMMAND } from "./shell-commands/ffmpeg";
import {
  createFfprobeCommand,
  FFPROBE_COMMAND,
} from "./shell-commands/ffprobe";
import { createNodeCommand } from "./shell-commands/node";
import { createPnpmCommand, PNPM_COMMAND } from "./shell-commands/pnpm";
import { createTsCommand, TS_COMMAND } from "./shell-commands/ts";
import { createTscCommand, TSC_COMMAND } from "./shell-commands/tsc";

// cspell:ignore mixmark papaparse

function stubCommand(
  name: string,
  message = "this command is non-functional in the sandboxed environment",
) {
  return defineCommand(name, () =>
    Promise.resolve({
      exitCode: 1,
      stderr: `${name}: ${message}\n`,
      stdout: "",
    }),
  );
}

// Commands excluded due to upstream bugs and replaced with stubs that explain
// the situation to the agent. Each entry explains why.
const BROKEN_COMMANDS = new Set<CommandName>([
  // cspell:ignore compressjs
  "file", // depends on `file-type`, which uses a CJS dynamic require("tty") incompatible with just-bash's ESM bundle
  "html-to-markdown", // depends on `turndown`, which requires `@mixmark-io/domino` as an undeclared peer dependency
  "sqlite3", // requires a separately compiled worker.js on disk (via import.meta.url resolution) that is not present in the asar bundle; sql.js is excluded from the build
  "tar", // depends on `compressjs`, whose default export is undefined in the ESM bundle context, crashing on load
  "which", // always errors in this environment; replaced with a stub below
  "yq", // depends on `papaparse`, which uses a CJS dynamic require("process") incompatible with just-bash's ESM bundle
]);

const STUB_COMMANDS = [
  stubCommand(
    "which",
    "not found as a system binary. This is a sandboxed environment -- commands are available to use directly, but they are not backed by real filesystem paths",
  ),
  stubCommand("file"),
  stubCommand("sqlite3", "SQLite is not available in this environment"),
  stubCommand("tar"),
  stubCommand("yq"),
];

const commandOrderPlugin: TransformPlugin<{ commands: string[] }> = {
  name: "command-order",
  transform(context: { ast: ScriptNode; metadata: Record<string, unknown> }) {
    const seen = new Set<string>();
    const commands: string[] = [];

    function walkScript(node: ScriptNode) {
      for (const stmt of node.statements) {
        walkStatement(stmt);
      }
    }

    function walkStatement(stmt: StatementNode) {
      for (const pipeline of stmt.pipelines) {
        for (const cmd of pipeline.commands) {
          walkCommand(cmd);
        }
      }
    }

    // cspell:ignore Subshell
    function walkCommand(node: CommandNode) {
      switch (node.type) {
        case "For":
        case "Group":
        case "Subshell":
        case "Until":
        case "While": {
          const stmts = [
            ...("condition" in node ? node.condition : []),
            ...node.body,
          ];
          for (const stmt of stmts) {
            walkStatement(stmt);
          }
          break;
        }
        case "FunctionDef": {
          walkCommand(node.body);
          break;
        }
        case "If": {
          for (const clause of node.clauses) {
            for (const stmt of [...clause.condition, ...clause.body]) {
              walkStatement(stmt);
            }
          }
          for (const stmt of node.elseBody ?? []) {
            walkStatement(stmt);
          }
          break;
        }
        case "SimpleCommand": {
          const part = node.name?.parts[0];
          if (part?.type === "Literal" && !seen.has(part.value)) {
            seen.add(part.value);
            commands.push(part.value);
          }
          for (const arg of node.args) {
            for (const p of arg.parts) {
              if (p.type === "CommandSubstitution") {
                walkScript(p.body);
              }
            }
          }
          break;
        }
      }
    }

    walkScript(context.ast);
    return { ast: context.ast, metadata: { commands } };
  },
};

// Commands non-obvious enough to warrant a description alongside their name.
const DESCRIBED_COMMANDS: Record<string, string> = {
  jq: "Parse and manipulate JSON",
  xan: "Fast CSV processing, filtering, aggregation, and visualization",
};

export function createBashDescription() {
  const allowedCommandNames = getCommandNames().filter(
    (name) => !BROKEN_COMMANDS.has(name as CommandName),
  );

  const namedOnly = allowedCommandNames
    .filter((name) => !(name in DESCRIBED_COMMANDS))
    .sort();

  const described = Object.entries(DESCRIBED_COMMANDS)
    .filter(([name]) => allowedCommandNames.includes(name))
    .map(([name, description]) => `  ${name} - ${description}`);

  const customLines = [
    `  ${FFMPEG_COMMAND.name} - ${FFMPEG_COMMAND.description}`,
    `  ${FFPROBE_COMMAND.name} - ${FFPROBE_COMMAND.description}`,
    `  ${PNPM_COMMAND.name} - ${PNPM_COMMAND.description}`,
    `  ${TS_COMMAND.name} - ${TS_COMMAND.description}`,
    `  ${TSC_COMMAND.name} - ${TSC_COMMAND.description}`,
    // Intentionally not listing Node because we want the agent to prefer TypeScript
  ];

  return [
    "Execute bash commands in the project directory.",
    "",
    "IMPORTANT: This is a sandboxed environment. python and other runtimes",
    "are NOT available as system binaries. Do NOT attempt to run them directly.",
    "Use the specialized `tsx` command below to execute TypeScript/JavaScript files.",
    "",
    "IMPORTANT: Not a persistent terminal -- each call starts fresh from the project root, so `cd .` is always a no-op.",
    "",
    "TIP: Before using an unfamiliar command, run `<command> --help` to check its argument syntax.",
    "",
    `Available commands: ${namedOnly.join(", ")}`,
    "",
    "Specialized commands:",
    ...described,
    ...customLines,
  ].join("\n");
}

export function createBashEnv(appConfig: AppConfig) {
  const fs = new ReadWriteFs({ root: appConfig.appDir });

  const allowedCommands = getCommandNames().filter(
    (name) => !BROKEN_COMMANDS.has(name as CommandName),
  ) as CommandName[];

  const providerEnv = envForProviderConfigs({
    configs: appConfig.workspaceConfig.getAIProviderConfigs(),
    workspaceServerURL: getWorkspaceServerURL(),
  });

  const bash = new Bash({
    commands: allowedCommands,
    customCommands: [
      createFfmpegCommand(appConfig),
      createFfprobeCommand(appConfig),
      createNodeCommand(appConfig),
      createPnpmCommand(appConfig),
      createTsCommand(appConfig),
      createTscCommand(appConfig),
      ...STUB_COMMANDS,
    ],
    cwd: "/",
    // Seed with process.env so PATH and other system vars are available to
    // commands that pass ctx.env explicitly (e.g. pnpm, tsx). Provider env
    // overrides last so AI keys are always present. pnpm shim files also
    // use sed, uname, etc when on unix systems.
    env: {
      ...(process.env.PATH && { PATH: process.env.PATH }),
      ...providerEnv,
    },
    fs,
  });

  bash.registerTransformPlugin(commandOrderPlugin);

  return bash;
}
