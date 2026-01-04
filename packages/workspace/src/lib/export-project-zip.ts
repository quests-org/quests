import { okAsync, safeTry } from "neverthrow";

import {
  APP_FOLDER_NAMES,
  GIT_AUTHOR,
  SESSIONS_DB_FILE_NAME,
} from "../constants";
import { type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { ensureGitRepo } from "./git/ensure-git-repo";
import { pathExists } from "./path-exists";

interface ExportProjectZipOptions {
  appDir: AppDir;
  includeChat: boolean;
  outputPath: string;
}

export function exportProjectZip({
  appDir,
  includeChat,
  outputPath,
}: ExportProjectZipOptions) {
  return safeTry(async function* () {
    const ensureResult = yield* ensureGitRepo({ appDir });

    const statusResult = yield* git(GitCommands.status(), appDir, {});

    if (
      ensureResult.created ||
      statusResult.stdout.toString("utf8").trim() !== ""
    ) {
      yield* git(GitCommands.addAll(), appDir, {});
      const commitMessage = ensureResult.created
        ? "Initial commit before export"
        : "Auto-commit before export";
      yield* git(GitCommands.commitWithAuthor(commitMessage), appDir, {});
    }

    let needsReset = false;

    if (includeChat) {
      const sessionsDbPath = absolutePathJoin(
        appDir,
        APP_FOLDER_NAMES.private,
        SESSIONS_DB_FILE_NAME,
      );
      const sessionsDbExists = await pathExists(sessionsDbPath);

      if (sessionsDbExists) {
        yield* git(
          ["add", "-f", `${APP_FOLDER_NAMES.private}/${SESSIONS_DB_FILE_NAME}`],
          appDir,
          {},
        );

        const statusAfterAdd = yield* git(GitCommands.status(), appDir, {});

        if (statusAfterAdd.stdout.toString("utf8").trim() !== "") {
          yield* git(
            [
              "commit",
              "-m",
              "Temporary: include chat for export",
              "--author",
              `${GIT_AUTHOR.name} <${GIT_AUTHOR.email}>`,
            ],
            appDir,
            {},
          );
          needsReset = true;
        }
      }
    }

    yield* git(GitCommands.archiveZip(outputPath), appDir, {});

    if (needsReset) {
      yield* git(["reset", "--soft", "HEAD~1"], appDir, {});
      yield* git(
        [
          "reset",
          "HEAD",
          `${APP_FOLDER_NAMES.private}/${SESSIONS_DB_FILE_NAME}`,
        ],
        appDir,
        {},
      );
    }

    return okAsync({ outputPath });
  });
}
