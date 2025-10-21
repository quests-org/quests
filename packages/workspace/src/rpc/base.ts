import {
  type ErrorMap,
  isDefinedError,
  onError,
  type ORPCErrorConstructorMap,
  os,
} from "@orpc/server";
import {
  type AIGatewayTypedError,
  type fetchAISDKModel,
} from "@quests/ai-gateway";

import { type TypedError } from "../lib/errors";
import { type WorkspaceActorRef } from "../machines/workspace";
import { type WorkspaceConfig } from "../types";

export interface WorkspaceRPCContext {
  modelRegistry: {
    languageModel: typeof fetchAISDKModel;
  };
  workspaceConfig: WorkspaceConfig;
  workspaceRef: WorkspaceActorRef;
}

const ORPC_ERRORS = {
  GATEWAY_FETCH_ERROR: {},
  GIT_ERROR: {},
  NOT_FOUND: {},
  PARSE_ERROR: {},
  STORAGE_ERROR: {},
  UNKNOWN: {},
} as const satisfies ErrorMap;

export type WorkspaceErrorMap = ORPCErrorConstructorMap<typeof ORPC_ERRORS>;

export const base = os
  .$context<WorkspaceRPCContext>()
  .errors(ORPC_ERRORS)
  .use(
    // Surprisingly not handled by Studio's onError handler
    // May be an oRPC bug.
    onError((error, { context }) => {
      if (isDefinedError(error)) {
        // eslint-disable-next-line no-console
        console.error("orpc error", error);
        return;
      }
      context.workspaceConfig.captureException(error, {
        scopes: ["workspace", "rpc"],
      });
    }),
  );

export function toORPCError(
  error: AIGatewayTypedError.Type | TypedError.Type,
  orpcErrors: WorkspaceErrorMap,
) {
  switch (error.type) {
    case "gateway-fetch-error": {
      return orpcErrors.GATEWAY_FETCH_ERROR({ message: error.message });
    }
    case "gateway-not-found-error":
    case "workspace-not-found-error": {
      return orpcErrors.NOT_FOUND({ message: error.message });
    }
    case "gateway-parse-error":
    case "workspace-parse-error": {
      return orpcErrors.PARSE_ERROR({ message: error.message });
    }
    case "workspace-git-error": {
      return orpcErrors.GIT_ERROR({ message: error.message });
    }
    case "workspace-storage-error": {
      return orpcErrors.STORAGE_ERROR({ message: error.message });
    }
    default: {
      return orpcErrors.UNKNOWN({ message: error.message });
    }
  }
}
