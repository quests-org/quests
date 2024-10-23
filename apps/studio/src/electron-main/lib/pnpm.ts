import { forkExecCommand } from "@/electron-main/lib/exec-command";
import { createRequire } from "node:module";
import path from "node:path";

export function getPnpmPath() {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve("pnpm");
  const unpackedPath = packageJsonPath.replace("app.asar", "app.asar.unpacked");
  const pnpmPath = path.dirname(unpackedPath);
  return path.join(pnpmPath, "bin", "pnpm.cjs");
}

export async function pnpmVersion() {
  const pnpmPath = getPnpmPath();
  const result = await forkExecCommand(pnpmPath, ["-v"]);
  return result.stdout;
}
