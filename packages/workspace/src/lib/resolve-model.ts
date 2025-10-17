import { type AIGatewayModel } from "@quests/ai-gateway";

import { getWorkspaceServerURL } from "../logic/server/url";
import { type WorkspaceErrorMap, type WorkspaceRPCContext } from "../rpc/base";
import { toORPCError } from "../rpc/base";
import { TypedError } from "./errors";

export async function resolveModel(
  modelURI: AIGatewayModel.URI,
  context: WorkspaceRPCContext,
  errors: WorkspaceErrorMap,
) {
  const [model, error] = (
    await context.modelRegistry.languageModel(
      modelURI,
      context.workspaceConfig.getAIProviderConfigs(),
      {
        captureException: context.workspaceConfig.captureException,
        workspaceServerURL: getWorkspaceServerURL(),
      },
    )
  )
    // eslint-disable-next-line unicorn/no-await-expression-member
    .toTuple();

  if (error) {
    context.workspaceConfig.captureException(error);
    throw toORPCError(
      new TypedError.NotFound(error.message, { cause: error }),
      errors,
    );
  }

  return model;
}
