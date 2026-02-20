import { PROJECT_MANIFEST_FILE_NAME } from "@quests/shared";
import { BlobReader, BlobWriter, ZipReader } from "@zip.js/zip.js";
import { errAsync, ok, ResultAsync, safeTry } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { ulid } from "ulid";

import { AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { absolutePathJoin } from "./absolute-path-join";
import { TypedError } from "./errors";
import { folderNameForSubdomain } from "./folder-name-for-subdomain";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { ensureGitRepo } from "./git/ensure-git-repo";
import { pathExists } from "./path-exists";

interface ImportProjectOptions {
  workspaceConfig: WorkspaceConfig;
  zipFileData: string;
}

export async function importProject(
  { workspaceConfig, zipFileData }: ImportProjectOptions,
  { signal }: { signal?: AbortSignal } = {},
) {
  return safeTry(async function* () {
    const subdomain = ProjectSubdomainSchema.parse(
      `import-${ulid().toLowerCase()}`,
    );

    const folderNameResult = folderNameForSubdomain(subdomain);
    if (folderNameResult.isErr()) {
      return errAsync(
        new TypedError.Parse(`Invalid subdomain format: ${subdomain}`),
      );
    }
    const folderName = folderNameResult.value;

    const projectDir = AppDirSchema.parse(
      absolutePathJoin(workspaceConfig.projectsDir, folderName),
    );

    const projectExists = await pathExists(projectDir);
    if (projectExists) {
      return errAsync(
        new TypedError.Conflict(
          `Project directory already exists: ${projectDir}`,
        ),
      );
    }

    yield* ResultAsync.fromPromise(
      (async () => {
        const buffer = Buffer.from(zipFileData, "base64");
        const blob = new Blob([buffer]);
        const zipReader = new ZipReader(new BlobReader(blob));
        const entries = await zipReader.getEntries();

        const hasQuestManifest = entries.some(
          (entry) => entry.filename === PROJECT_MANIFEST_FILE_NAME,
        );
        if (!hasQuestManifest) {
          throw new TypedError.NotFound(
            `Zip file does not contain ${PROJECT_MANIFEST_FILE_NAME}`,
          );
        }

        await fs.mkdir(projectDir, { recursive: true });

        for (const entry of entries) {
          if (!entry.filename || entry.directory) {
            continue;
          }

          // Needed for importing a project from Windows on a POSIX machine.
          const normalizedFilename = entry.filename.replaceAll("\\", "/");
          const fullPath = absolutePathJoin(projectDir, normalizedFilename);
          const dirPath = path.dirname(fullPath);
          await fs.mkdir(dirPath, { recursive: true });

          const writer = new BlobWriter();
          const entryBlob = await entry.getData(writer);
          const arrayBuffer = await entryBlob.arrayBuffer();
          await fs.writeFile(fullPath, Buffer.from(arrayBuffer));
        }

        await zipReader.close();
      })(),
      (error) =>
        new TypedError.FileSystem(
          `Failed to extract zip file: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        ),
    );

    const ensureResult = yield* ensureGitRepo({
      appDir: projectDir,
      signal,
    });

    if (ensureResult.created) {
      yield* git(GitCommands.addAll(), projectDir, { signal });
      // If "import" is used literally at the end of a string, it will cause an
      // unterminated string literal error with Electron Vite.
      const reservedWord = "import";
      yield* git(
        GitCommands.commitWithAuthor(`Initial commit after ${reservedWord}`),
        projectDir,
        { signal },
      );
    }

    return ok({ projectConfig: { appDir: projectDir, subdomain } });
  });
}
