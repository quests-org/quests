import { bashTools } from "bash-tool";
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

import { absolutePathJoin } from "./absolute-path-join";
import { PNPM_COMMAND, pnpmCommand } from "./shell-commands/pnpm";
import { TS_COMMAND, tsCommand } from "./shell-commands/ts";
import { TSC_COMMAND, tscCommand } from "./shell-commands/tsc";

// cspell:ignore mixmark papaparse

// These just-bash commands have third-party dependencies that are not properly
// declared in just-bash's own package.json, causing runtime resolution failures
// in pnpm's isolated node_modules. Exclude them until fixed upstream.
//
// - html-to-markdown: depends on `turndown`, which requires `@mixmark-io/domino`
//   as an undeclared peer dependency
// - yq: depends on `papaparse`, which uses a CJS dynamic require("process") that
//   is incompatible with just-bash's ESM bundle
const BROKEN_COMMANDS = new Set<CommandName>(["html-to-markdown", "yq"]);

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
const DESCRIBED_COMMANDS = new Set(["jq", "xan"]);

export function createBashDescription() {
  const allowedCommandNames = new Set(
    getCommandNames().filter(
      (name) => !BROKEN_COMMANDS.has(name as CommandName),
    ),
  );

  const builtinNames = bashTools
    .filter((t) => allowedCommandNames.has(t.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const namedOnly = builtinNames
    .filter((t) => !DESCRIBED_COMMANDS.has(t.name))
    .map((t) => t.name);

  const described = builtinNames
    .filter((t) => DESCRIBED_COMMANDS.has(t.name))
    .map(({ name, purpose }) => `  ${name} - ${purpose}`);

  const customLines = [
    `  ${PNPM_COMMAND.name} - ${PNPM_COMMAND.description}`,
    `  ${TS_COMMAND.name}/${TS_COMMAND.alias} - ${TS_COMMAND.description}`,
    `  ${TSC_COMMAND.name} - ${TSC_COMMAND.description}`,
  ];

  return [
    "Execute bash commands in the project directory.",
    "",
    "IMPORTANT: This is a sandboxed environment. npm, python, and other runtimes are",
    "NOT available. Do NOT attempt to run them.",
    "",
    "IMPORTANT: Each call starts fresh from the project root -- `cd` does not persist between calls.",
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

  const bash = new Bash({
    commands: allowedCommands,
    customCommands: [
      createPnpmCommand(appConfig),
      createTsCommand(appConfig),
      createTsxAliasCommand(appConfig),
      createTscCommand(appConfig),
    ],
    cwd: "/",
    fs,
  });

  bash.registerTransformPlugin(commandOrderPlugin);

  return bash;
}

function createPnpmCommand(appConfig: AppConfig) {
  return defineCommand("pnpm", async (args, ctx) => {
    const cwd = resolveRealCwd(appConfig, ctx.cwd);
    const result = await pnpmCommand(args, appConfig, ctx.signal, cwd);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}

function createTscCommand(appConfig: AppConfig) {
  return defineCommand("tsc", async (args, ctx) => {
    const cwd = resolveRealCwd(appConfig, ctx.cwd);
    const result = await tscCommand(args, appConfig, ctx.signal, cwd);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}

function createTsCommand(appConfig: AppConfig) {
  return defineCommand("ts", async (args, ctx) => {
    const cwd = resolveRealCwd(appConfig, ctx.cwd);
    const result = await tsCommand(args, appConfig, ctx.signal, cwd);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}

function createTsxAliasCommand(appConfig: AppConfig) {
  return defineCommand("tsx", async (args, ctx) => {
    const cwd = resolveRealCwd(appConfig, ctx.cwd);
    const result = await tsCommand(args, appConfig, ctx.signal, cwd);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}

function resolveRealCwd(appConfig: AppConfig, virtualCwd: string) {
  return absolutePathJoin(appConfig.appDir, virtualCwd);
}
