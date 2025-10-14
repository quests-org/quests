import { execa, type Options } from "execa";
import { err, ok } from "neverthrow";

import { type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { TypedError } from "./errors";
import { readPNPMShim } from "./read-pnpm-shim";

export async function runNodeModuleBin(
  appDir: AppDir,
  bin: string,
  args: string[],
  options?: Options,
) {
  const shimPath = absolutePathJoin(appDir, "node_modules", ".bin", bin);
  const binPathResult = await readPNPMShim(shimPath);

  if (binPathResult.isErr()) {
    return err(binPathResult.error);
  }

  const binPath = binPathResult.value;

  try {
    return ok(execa(binPath, args, { cwd: appDir, node: true, ...options }));
  } catch (error) {
    return err(
      new TypedError.NotFound(
        `Failed to execute ${bin}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}
