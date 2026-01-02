import { ok, safeTry } from "neverthrow";

import { type AbsolutePath } from "../../schemas/paths";
import { GitCommands } from "./commands";
import { git } from "./index";

export function ensureGitRepo({
  appDir,
  signal,
}: {
  appDir: AbsolutePath;
  signal?: AbortSignal;
}) {
  return safeTry(async function* () {
    const checkResult = await git(
      ["rev-parse", "--is-inside-work-tree"],
      appDir,
      { signal },
    );

    if (checkResult.isOk()) {
      return ok({ created: false });
    }

    yield* git(GitCommands.init(), appDir, { signal });
    return ok({ created: true });
  });
}
