import type {
  CommandNode,
  ScriptNode,
  StatementNode,
  TransformPlugin,
} from "just-bash";

import { Bash, defineCommand, ReadWriteFs } from "just-bash";

import type { AppConfig } from "./app-config/types";

import { absolutePathJoin } from "./absolute-path-join";
import { pnpmCommand } from "./shell-commands/pnpm";
import { tsCommand } from "./shell-commands/ts";
import { tscCommand } from "./shell-commands/tsc";

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

export function createBashEnv(appConfig: AppConfig) {
  const fs = new ReadWriteFs({ root: appConfig.appDir });

  const bash = new Bash({
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
