import { type LanguageModelV2 } from "@ai-sdk/provider";
import { type AIGatewayModelURI } from "@quests/ai-gateway";

import { type SessionMessage } from "../schemas/session/message";
import { type AppSubdomain } from "../schemas/subdomains";
import { type WorkspaceConfig } from "../types";
import { createAppConfig } from "./app-config/create";
import { projectModeForSubdomain } from "./project-mode-for-subdomain";
import { setProjectState } from "./project-state-store";
import { textForMessage } from "./text-for-message";

interface CreateMessageParams {
  filesCount: number;
  message: SessionMessage.WithParts;
  model: LanguageModelV2;
  modelURI: AIGatewayModelURI.Type;
  subdomain: AppSubdomain;
  workspaceConfig: WorkspaceConfig;
}

export async function createMessage({
  filesCount,
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
    files_count: filesCount,
    length: messageText.length,
    modelId: model.modelId,
    project_mode: projectModeForSubdomain(subdomain),
    providerId: model.provider,
  });

  return { appConfig };
}
