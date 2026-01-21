import { type AppDir } from "../schemas/paths";

export function filterShellOutput(output: string, appDir: AppDir): string {
  const filtered = output
    .split("\n")
    .filter((line) => !shouldFilterDebuggerMessage(line.trim()))
    .join("\n");

  return filtered.replaceAll(appDir, ".");
}

export function shouldFilterDebuggerMessage(message: string): boolean {
  const shouldFilter =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  return (
    shouldFilter &&
    (message.includes("Debugger attached.") ||
      message.includes("Waiting for the debugger to disconnect..."))
  );
}
