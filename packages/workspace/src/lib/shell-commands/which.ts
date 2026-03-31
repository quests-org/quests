import { defineCommand } from "just-bash";

// just-bash's built-in `which` errors unconditionally against a ReadWriteFs
// (no real filesystem paths). This shim returns exit 0 for known commands so
// agents that probe for binary availability before using them don't get false
// negatives.
export function createWhichCommand(availableCommands: Set<string>) {
  return defineCommand("which", (args) => {
    const name = args[0];
    if (!name) {
      return Promise.resolve({
        exitCode: 1,
        stderr: "which: missing argument\n",
        stdout: "",
      });
    }
    if (availableCommands.has(name)) {
      return Promise.resolve({ exitCode: 0, stderr: "", stdout: `${name}\n` });
    }
    return Promise.resolve({
      exitCode: 1,
      stderr: `which: no ${name} in sandboxed environment\n`,
      stdout: "",
    });
  });
}
