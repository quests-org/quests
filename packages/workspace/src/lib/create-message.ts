import { type LanguageModelV2 } from "@ai-sdk/provider";
import { type AIGatewayModel } from "@quests/ai-gateway";

import { type SessionMessage } from "../schemas/session/message";
import { type AppSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { setProjectState } from "./project-state-store";
import { textForMessage } from "./text-for-message";

interface CreateMessageParams {
  message: SessionMessage.WithParts;
  model: LanguageModelV2;
  modelURI: AIGatewayModel.URI;
  subdomain: AppSubdomain;
  workspaceConfig: WorkspaceConfig;
}

export async function createMessage({
  message,
  model,
  modelURI,
  subdomain,
  workspaceConfig,
}: CreateMessageParams) {
  const appConfig = createAppConfig({
    subdomain,
    workspaceConfig,
  });

  await setProjectState(appConfig.appDir, { selectedModelURI: modelURI });

  const messageText = textForMessage(message);

  workspaceConfig.captureEvent("message.created", {
    length: messageText.length,
    modelId: model.modelId,
    providerId: model.provider,
  });

  return { appConfig };
}
