import {
  type ActorRef,
  type ActorRefFrom,
  type AnyEventObject,
  type AnyMachineSnapshot,
  fromCallback,
} from "xstate";

import { REGISTRY_TEMPLATES_FOLDER } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { type AppConfigPreview } from "../lib/app-config/types";
import { copyTemplate } from "../lib/copy-template";

export type CreatePreviewParentEvent =
  | {
      type: "createPreview.done";
      value: {
        actorId: string;
        appConfig: AppConfigPreview;
      };
    }
  | {
      type: "createPreview.error";
      value: {
        message: string;
      };
    };

type ParentActorRef = ActorRef<AnyMachineSnapshot, CreatePreviewParentEvent>;

export const createPreviewLogic = fromCallback<
  AnyEventObject,
  {
    appConfig: AppConfigPreview;
    parentRef: ParentActorRef;
  }
>(({ input, self }) => {
  const templateDir = absolutePathJoin(
    input.appConfig.workspaceConfig.registryDir,
    REGISTRY_TEMPLATES_FOLDER,
    input.appConfig.folderName,
  );

  void copyTemplate({
    targetDir: input.appConfig.appDir,
    templateDir,
  })
    .match(
      () => ({
        type: "createPreview.done" as const,
        value: {
          actorId: self.id,
          appConfig: input.appConfig,
        },
      }),
      (error) => ({
        type: "createPreview.error" as const,
        value: { message: error.message },
      }),
    )
    .then((event) => {
      input.parentRef.send(event);
    });
});

export type CreatePreviewActorRef = ActorRefFrom<typeof createPreviewLogic>;
