import { okAsync, safeTry } from "neverthrow";

import { APP_PRIVATE_FOLDER, GIT_AUTHOR } from "../constants";
import { type AppDir } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { git } from "./git";
import { GitCommands } from "./git/commands";
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
    const sourceGitDir = absolutePathJoin(appDir, ".git");
    const hasGitRepo = await pathExists(sourceGitDir);

    if (hasGitRepo) {
      const statusResult = yield* git(GitCommands.status(), appDir, {});

      if (statusResult.stdout.toString("utf8").trim() !== "") {
        yield* git(GitCommands.addAll(), appDir, {});
        yield* git(
          GitCommands.commitWithAuthor("Auto-commit before export"),
          appDir,
          {},
        );
      }
    } else {
      yield* git(GitCommands.init(), appDir, {});
      yield* git(GitCommands.addAll(), appDir, {});
      yield* git(
        GitCommands.commitWithAuthor("Initial commit before export"),
        appDir,
        {},
      );
    }

    if (includeChat) {
      const privateDir = absolutePathJoin(appDir, APP_PRIVATE_FOLDER);
      const privateDirExists = await pathExists(privateDir);

      if (privateDirExists) {
        yield* git(
          ["add", "-f", "--all", `${APP_PRIVATE_FOLDER}/`],
          appDir,
          {},
        );
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
        yield* git(GitCommands.archiveZip(outputPath), appDir, {});
        yield* git(["reset", "--soft", "HEAD~1"], appDir, {});
        yield* git(["reset", "HEAD", `${APP_PRIVATE_FOLDER}/`], appDir, {});
      } else {
        yield* git(GitCommands.archiveZip(outputPath), appDir, {});
      }
    } else {
      yield* git(GitCommands.archiveZip(outputPath), appDir, {});
    }

    return okAsync({ outputPath });
  });
}
