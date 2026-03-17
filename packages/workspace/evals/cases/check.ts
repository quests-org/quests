import { APP_FOLDER_NAMES } from "../../src/constants";
import { TSC_COMMAND } from "../../src/lib/shell-commands/tsc";
import { type SessionMessagePart } from "../../src/schemas/session/message-part";
import { type Assertion, defineEval } from "../harness";

const PDF_SKILL_NAME = "pdf";
const PDF_SKILL_TSC_PROJECT = `${APP_FOLDER_NAMES.skills}/${PDF_SKILL_NAME}/tsconfig.json`;
const PDF_SKILL_TSC_COMMAND = `${TSC_COMMAND.name} --noEmit --project ${PDF_SKILL_TSC_PROJECT}`;
const ROOT_TSC_COMMAND = `${TSC_COMMAND.name} --noEmit`;
const ROOT_TSC_COMMAND_EQUIVALENTS = new Set([
  `${TSC_COMMAND.name} --noEmit --project ./tsconfig.json`,
  `${TSC_COMMAND.name} --noEmit --project tsconfig.json`,
  ROOT_TSC_COMMAND,
]);

function getTscCommand(part: SessionMessagePart.Type): string | undefined {
  if (part.type !== "tool-run_shell_command") {
    return undefined;
  }
  const command: unknown = part.input?.command;
  if (typeof command !== "string" || !command.startsWith(TSC_COMMAND.name)) {
    return undefined;
  }
  return command;
}

function makeAssertTscCommand(
  expectedCommand: string,
  equivalents?: Set<string>,
): Assertion {
  return {
    check: ({ sessions }) => {
      const usedCommands = sessions
        .flatMap((s) => s.messages)
        .flatMap((m) => m.parts)
        .map(getTscCommand)
        .filter((c) => c !== undefined);

      const passed = usedCommands.some((c) =>
        equivalents ? equivalents.has(c.trim()) : c.trim() === expectedCommand,
      );
      return {
        evidence: passed
          ? `Found \`${expectedCommand}\``
          : `Expected \`${expectedCommand}\`, got: ${usedCommands.length > 0 ? usedCommands.map((c) => `\`${c}\``).join(", ") : "no tsc calls"}`,
        passed,
        text: `Ran \`${expectedCommand}\``,
      };
    },
    text: `Ran \`${expectedCommand}\``,
  };
}

function makeStopAfterTscCommand(
  expectedCommand: string,
  equivalents?: Set<string>,
) {
  return (part: SessionMessagePart.Type) => {
    const command = getTscCommand(part);
    const matches = equivalents
      ? command !== undefined && equivalents.has(command.trim())
      : command !== undefined && command.trim() === expectedCommand;
    return matches && "state" in part && part.state === "output-available";
  };
}

export const CHECK_EVALS = [
  defineEval({
    assertions: [
      makeAssertTscCommand(ROOT_TSC_COMMAND, ROOT_TSC_COMMAND_EQUIVALENTS),
    ],
    name: "create-syntax-error-then-check",
    prompt:
      "Create a TypeScript file at scripts/broken.ts with a type error in it, then check for type errors and stop.",
    shouldStop: makeStopAfterTscCommand(
      ROOT_TSC_COMMAND,
      ROOT_TSC_COMMAND_EQUIVALENTS,
    ),
  }),
  defineEval({
    assertions: [
      makeAssertTscCommand(ROOT_TSC_COMMAND, ROOT_TSC_COMMAND_EQUIVALENTS),
    ],
    name: "create-script-then-check-diagnostics",
    prompt:
      "Create a script at scripts/summarize.ts that reads a JSON file at output/data.json, parses it, and prints a summary of its keys and values to the console.",
    shouldStop: makeStopAfterTscCommand(
      ROOT_TSC_COMMAND,
      ROOT_TSC_COMMAND_EQUIVALENTS,
    ),
  }),
  defineEval({
    assertions: [makeAssertTscCommand(PDF_SKILL_TSC_COMMAND)],
    name: "pdf-skill-syntax-error-then-check",
    prompt: `Load the ${PDF_SKILL_NAME} skill, create a TypeScript file in its scripts folder with a type error in it, then check for type errors and stop.`,
    shouldStop: makeStopAfterTscCommand(PDF_SKILL_TSC_COMMAND),
  }),
];
