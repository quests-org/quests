export function filterDebuggerMessages(stderr: string): string {
  return stderr
    .split("\n")
    .filter((line) => !shouldFilterDebuggerMessage(line.trim()))
    .join("\n");
}

export function shouldFilterDebuggerMessage(message: string): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    (message.includes("Debugger attached.") ||
      message.includes("Waiting for the debugger to disconnect..."))
  );
}
