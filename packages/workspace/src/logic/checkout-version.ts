import { errAsync, ok, safeTry } from "neverthrow";
import {
  type ActorRef,
  type ActorRefFrom,
  type AnyEventObject,
  type AnyMachineSnapshot,
  fromCallback,
} from "xstate";

import { createAppConfig } from "../lib/app-config/create";
import { type AppConfigVersion } from "../lib/app-config/types";
import { folderNameForSubdomain } from "../lib/folder-name-for-subdomain";
import { git, type GitError } from "../lib/git";
import { projectSubdomainForSubdomain } from "../lib/project-subdomain-for-subdomain";

export type CheckoutVersionParentEvent =
  | {
      type: "checkoutVersion.done";
      value: {
        actorId: string;
        appConfig: AppConfigVersion;
      };
    }
  | {
      type: "checkoutVersion.error";
      value: {
        message: string;
      };
    };

type ParentActorRef = ActorRef<AnyMachineSnapshot, CheckoutVersionParentEvent>;

export const checkoutVersionLogic = fromCallback<
  AnyEventObject,
  {
    appConfig: AppConfigVersion;
    parentRef: ParentActorRef;
  }
>(({ input, self }) => {
  const abortController = new AbortController();
  const signal = abortController.signal;

  async function run() {
    return safeTry<
      {
        type: "checkoutVersion.done";
        value: { actorId: string; appConfig: AppConfigVersion };
      },
      GitError | { message: string; type: "unknown" }
    >(async function* () {
      const versionConfig = input.appConfig;

      // Extract the git ref from the version subdomain using safe helpers
      const projectSubdomain = projectSubdomainForSubdomain(
        versionConfig.subdomain,
      );
      const gitRefResult = folderNameForSubdomain(versionConfig.subdomain);

      if (gitRefResult.isErr()) {
        return errAsync({
          message: `Failed to extract git ref from version subdomain: ${versionConfig.subdomain}`,
          type: "unknown" as const,
        });
      }

      const gitRef = gitRefResult.value;

      // Get the project config to know where the main git repository is
      const projectConfig = createAppConfig({
        subdomain: projectSubdomain,
        workspaceConfig: versionConfig.workspaceConfig,
      });

      // Create git worktree for the specific commit/ref
      yield* git(
        ["worktree", "add", versionConfig.appDir, gitRef],
        projectConfig.appDir,
        { signal },
      );

      return ok({
        type: "checkoutVersion.done" as const,
        value: {
          actorId: self.id,
          appConfig: versionConfig,
        },
      });
    });
  }

  run()
    .then((result) => {
      if (result.isOk()) {
        input.parentRef.send(result.value);
      } else {
        input.parentRef.send({
          type: "checkoutVersion.error",
          value: { message: result.error.message },
        });
      }
    })
    .catch((error: unknown) => {
      input.parentRef.send({
        type: "checkoutVersion.error",
        value: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    });

  return () => {
    abortController.abort();
  };
});

export type CheckoutVersionActorRef = ActorRefFrom<typeof checkoutVersionLogic>;
