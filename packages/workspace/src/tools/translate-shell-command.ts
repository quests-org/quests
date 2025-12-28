import { err, ok, type Result } from "neverthrow";
import { type ParseEntry, parse as shellQuoteParse } from "shell-quote";

/**
 * Translates a shell command string from an agent into a safe argv array
 * that can be executed in the restricted tool environment.
 *
 * Takes what appears to be a normal shell command and converts it to a format
 * suitable for controlled execution with execa. Intentionally restrictive:
 * - Rejects shell control operators (&&, ||, |, ;, etc.) - agent must call tool multiple times
 * - Ignores comments
 * - Converts glob patterns to literal strings (no expansion)
 * - Returns clean argv array
 *
 * @param command - The shell command string from the agent
 * @returns Result containing argv array, or an error message
 */
export function translateShellCommand(
  command: string,
): Result<string[], { message: string }> {
  const trimmed = command.trim();
  if (!trimmed) {
    return err({ message: "Command cannot be empty" });
  }

  let parsed: ParseEntry[];
  try {
    parsed = shellQuoteParse(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({ message: `Failed to parse command: ${message}` });
  }

  const argv: string[] = [];
  const controlOperators: string[] = [];

  for (const entry of parsed) {
    if (typeof entry === "string") {
      argv.push(entry);
      continue;
    }

    // Ignore comments
    if ("comment" in entry) {
      continue;
    }

    // Convert glob patterns to literal strings (no expansion)
    if (entry.op === "glob") {
      argv.push(entry.pattern);
      continue;
    }

    // All remaining ops are shell control operators like &&, ||, |, ;
    controlOperators.push(entry.op);
  }

  // Reject commands with control operators
  if (controlOperators.length > 0) {
    return err({
      message: `Only one command can be run at a time. Shell control operators are not allowed (found: ${controlOperators.join(
        ", ",
      )}). Call this tool multiple times instead.`,
    });
  }

  return ok(argv);
}
