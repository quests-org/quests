import { err, ok, safeTry } from "neverthrow";

import { type SessionMessage } from "../schemas/session/message";
import { type SessionMessageDataPart } from "../schemas/session/message-data-part";
import { StoreId } from "../schemas/store-id";
import { type ProjectSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { TypedError } from "./errors";
import { git } from "./git";
import { GitCommands } from "./git/commands";
import { Store } from "./store";

export async function restoreVersion({
  gitRef,
  projectSubdomain,
  sessionId,
  workspaceConfig,
}: {
  gitRef: string;
  projectSubdomain: ProjectSubdomain;
  sessionId: StoreId.Session;
  workspaceConfig: WorkspaceConfig;
}) {
  const projectConfig = createAppConfig({
    subdomain: projectSubdomain,
    workspaceConfig,
  });

  return safeTry(async function* () {
    const assistantMessage: SessionMessage.Assistant = {
      id: StoreId.newMessageId(),
      metadata: {
        createdAt: new Date(),
        finishReason: "stop",
        modelId: "quests-synthetic",
        providerId: "system",
        sessionId,
        synthetic: true,
      },
      role: "assistant",
    };

    yield* Store.saveMessage(assistantMessage, projectConfig);

    const refResult = yield* git(
      GitCommands.verifyCommitRef(gitRef),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(5000) },
    ).mapErr(
      (error) =>
        new TypedError.NotFound("The selected version could not be found", {
          cause: error,
        }),
    );

    const restoredToRef = refResult.stdout.toString().trim();

    const statusResult = yield* git(
      GitCommands.status(),
      projectConfig.appDir,
      {
        signal: AbortSignal.timeout(5000),
      },
    );

    // If there are uncommitted changes, commit them first
    if (statusResult.stdout.toString().trim() !== "") {
      yield* git(GitCommands.addAll(), projectConfig.appDir, {
        signal: AbortSignal.timeout(10_000),
      });

      const commitMessage = `Save current work before version restore`;
      yield* git(
        GitCommands.commitWithAuthor(commitMessage),
        projectConfig.appDir,
        { signal: AbortSignal.timeout(10_000) },
      );

      const getCommitRefResult = yield* git(
        GitCommands.revParse("HEAD"),
        projectConfig.appDir,
        { signal: AbortSignal.timeout(5000) },
      );

      const commitRef = getCommitRefResult.stdout.toString().trim();

      yield* await Store.saveParts(
        [
          {
            metadata: {
              createdAt: new Date(),
              id: StoreId.newPartId(),
              messageId: assistantMessage.id,
              sessionId,
            },
            text: "I saved your current work before restoring to the selected version.",
            type: "text" as const,
          },
          {
            data: {
              ref: commitRef,
            } satisfies SessionMessageDataPart.GitCommitDataPart,
            metadata: {
              createdAt: new Date(),
              id: StoreId.newPartId(),
              messageId: assistantMessage.id,
              sessionId,
            },
            type: "data-gitCommit",
          },
        ],
        projectConfig,
      );
    }

    // Now checkout all files from the target ref, which will stage them automatically
    // This brings the working directory to the exact state of the target ref
    yield* git(GitCommands.checkoutFiles(gitRef), projectConfig.appDir, {
      signal: AbortSignal.timeout(10_000),
    });

    const statusAfterCheckoutResult = yield* git(
      GitCommands.status(),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(5000) },
    );

    if (statusAfterCheckoutResult.stdout.toString().trim() === "") {
      return err(new TypedError.NoChanges("No changes to commit"));
    }

    yield* git(GitCommands.addAll(), projectConfig.appDir, {
      signal: AbortSignal.timeout(10_000),
    });

    yield* git(
      GitCommands.commitWithAuthor("Restored to old version"),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(10_000) },
    );

    const getRestoreCommitRefResult = yield* git(
      GitCommands.revParse("HEAD"),
      projectConfig.appDir,
      { signal: AbortSignal.timeout(5000) },
    );

    const restoreCommitRef = getRestoreCommitRefResult.stdout.toString().trim();

    // Save final parts: success text and restore commit data
    yield* await Store.saveParts(
      [
        {
          metadata: {
            createdAt: new Date(),
            id: StoreId.newPartId(),
            messageId: assistantMessage.id,
            sessionId,
          },
          text: "Your project has been restored to the selected version.",
          type: "text" as const,
        },
        {
          data: {
            ref: restoreCommitRef,
            restoredFromRef: restoredToRef,
          } satisfies SessionMessageDataPart.GitCommitDataPart,
          metadata: {
            createdAt: new Date(),
            id: StoreId.newPartId(),
            messageId: assistantMessage.id,
            sessionId,
          },
          type: "data-gitCommit",
        },
      ],
      projectConfig,
    );

    return ok({
      restoreCommitRef,
      restoredToRef,
      sessionId,
    });
  });
}
