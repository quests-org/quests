import { errAsync, ok, safeTry } from "neverthrow";
import fs from "node:fs/promises";

import { newProjectConfig } from "../lib/app-config/new";
import { copyTemplate } from "../lib/copy-template";
import { TypedError } from "../lib/errors";
import { git } from "../lib/git";
import { GitCommands } from "../lib/git/commands";
import { Store } from "../lib/store";
import { type Session } from "../schemas/session";
import { type SessionMessageDataPart } from "../schemas/session/message-data-part";
import { StoreId } from "../schemas/store-id";
import { type WorkspaceConfig } from "../types";
import { type AppConfigPreview } from "./app-config/types";

interface CreateProjectFromPreviewOptions {
  previewConfig: AppConfigPreview;
  sessionId: StoreId.Session;
  workspaceConfig: WorkspaceConfig;
}

export async function createProjectFromPreview(
  {
    previewConfig,
    sessionId,
    workspaceConfig,
  }: CreateProjectFromPreviewOptions,
  { signal }: { signal?: AbortSignal } = {},
) {
  return safeTry(async function* () {
    const projectConfig = await newProjectConfig({
      workspaceConfig,
    });

    // Ensure no project folder exists
    const projectExists = await fs
      .access(projectConfig.appDir)
      .then(() => true)
      .catch(() => false);
    if (projectExists) {
      return errAsync(
        new TypedError.Conflict(
          `Project directory already exists: ${projectConfig.appDir}`,
        ),
      );
    }

    // Ensure preview folder exists
    const previewExists = await fs
      .access(previewConfig.appDir)
      .then(() => true)
      .catch(() => false);
    if (!previewExists) {
      return errAsync(
        new TypedError.NotFound(
          `Preview directory does not exist: ${previewConfig.appDir}`,
        ),
      );
    }

    // Copy the preview directory to the project directory
    yield* copyTemplate({
      targetDir: projectConfig.appDir,
      templateDir: previewConfig.appDir,
    }).orElse((error) => {
      return errAsync(
        new TypedError.FileSystem(error.message, { cause: error }),
      );
    });

    // Initialize git repository in the new project
    yield* git(GitCommands.init(), projectConfig.appDir, { signal });

    // Create initial commit
    yield* git(GitCommands.addAll(), projectConfig.appDir, { signal });
    yield* git(
      GitCommands.commitWithAuthor(
        `First version of ${previewConfig.folderName}`,
      ),
      projectConfig.appDir,
      { signal },
    );

    const commitRef = yield* git(
      GitCommands.revParse("HEAD"),
      projectConfig.appDir,
      { signal },
    );

    const session: Session.Type = {
      createdAt: new Date(),
      id: sessionId,
      title: `Created project from ${previewConfig.folderName}`,
    };

    yield* Store.saveSession(session, projectConfig);

    const messageId = StoreId.newMessageId();
    yield* (
      await Store.saveMessageWithParts(
        {
          id: messageId,
          metadata: {
            createdAt: new Date(),
            finishReason: "stop",
            modelId: "quests-synthetic",
            providerId: "system",
            sessionId,
            synthetic: true,
          },
          parts: [
            {
              metadata: {
                createdAt: new Date(),
                id: StoreId.newPartId(),
                messageId,
                sessionId,
              },
              text: `Created a new project from ${previewConfig.folderName}`,
              type: "text" as const,
            },
            {
              data: {
                ref: commitRef.stdout.toString().trim(),
              } satisfies SessionMessageDataPart.GitCommitDataPart,
              metadata: {
                createdAt: new Date(),
                id: StoreId.newPartId(),
                messageId,
                sessionId,
              },
              type: "data-gitCommit",
            },
          ],
          role: "assistant",
        },
        projectConfig,
      )
    )
      // eslint-disable-next-line unicorn/no-await-expression-member
      .mapErr(
        (error) =>
          new TypedError.Storage(
            `Failed to save assistant message: ${error.message}`,
            { cause: error },
          ),
      );

    return ok({ projectConfig });
  });
}
