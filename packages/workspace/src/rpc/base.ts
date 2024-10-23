import { type ErrorMap, type ORPCErrorConstructorMap, os } from "@orpc/server";
import { type fetchAISDKModel, type TypedError } from "@quests/ai-gateway";

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
  SCHEMA_ERROR: {},
  STORAGE_ERROR: {},
  UNKNOWN: {},
} as const satisfies ErrorMap;

type WorkspaceErrorMap = ORPCErrorConstructorMap<typeof ORPC_ERRORS>;

export const base = os.$context<WorkspaceRPCContext>().errors(ORPC_ERRORS);

type KnownInternalError =
  | "gateway-fetch-error"
  | "git-error"
  | "not-found"
  | "parse-error"
  | "schema-error"
  | "storage-error";

export function toORPCError(
  error:
    | TypedError.Type
    | {
        message: string;
        // (string & {}) is a workaround to allow any string as a type without
        // clobbering the type system
        type: KnownInternalError | (string & {});
      },
  orpcErrors: WorkspaceErrorMap,
) {
  // cast to ensure switch type-safe
  switch (error.type as KnownInternalError | TypedError.Type["type"]) {
    case "gateway-fetch-error": {
      return orpcErrors.GATEWAY_FETCH_ERROR({ message: error.message });
    }
    case "gateway-not-found-error":
    case "not-found": {
      return orpcErrors.NOT_FOUND({ message: error.message });
    }
    case "gateway-parse-error":
    case "parse-error": {
      return orpcErrors.PARSE_ERROR({ message: error.message });
    }
    case "git-error": {
      return orpcErrors.GIT_ERROR({ message: error.message });
    }
    case "schema-error": {
      return orpcErrors.SCHEMA_ERROR({ message: error.message });
    }
    case "storage-error": {
      return orpcErrors.STORAGE_ERROR({ message: error.message });
    }
    default: {
      return orpcErrors.UNKNOWN({ message: error.message });
    }
  }
}
