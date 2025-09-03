import { envForProviders } from "@quests/ai-gateway";
import { ok } from "neverthrow";

import { type AnyAgent } from "../agents/types";
import { getWorkspaceServerURL } from "../logic/server/url";
import { SessionMessage } from "../schemas/session/message";
import { type StoreId } from "../schemas/store-id";
import { ALL_AI_SDK_TOOLS } from "../tools/all";
import { addCacheControlToMessages } from "./add-cache-control";
import { type AppConfig } from "./app-config/types";
import { normalizeToolCallIds } from "./normalize-tool-call-ids";
import { Store } from "./store";

export async function prepareModelMessages({
  agent,
  appConfig,
  modelId,
  providerId,
  sessionId,
  signal,
}: {
  agent: AnyAgent;
  appConfig: AppConfig;
  modelId: string;
  providerId: string;
  sessionId: StoreId.Session;
  signal: AbortSignal;
}) {
  const env = await envForProviders({
    captureException: appConfig.workspaceConfig.captureException,
    providers: appConfig.workspaceConfig.getAIProviders(),
    workspaceServerURL: getWorkspaceServerURL(),
  });

  const messageResults = await Store.getMessagesWithParts(
    { appConfig, sessionId },
    { signal },
  );

  if (messageResults.isErr()) {
    return messageResults;
  }
  const messages = messageResults.value;

  const agentMessages = await agent.getMessages({
    appConfig,
    envVariableNames: Object.keys(env),
  });

  const modelMessages = [
    ...agentMessages,
    // Including all tools so they can run their toModelOutput even if they
    // are not used in this session
    ...SessionMessage.toModelMessages(messages, ALL_AI_SDK_TOOLS),
  ];

  const cachedModelMessages = addCacheControlToMessages({
    messages: modelMessages,
    modelId,
    providerId,
  });

  return ok(
    normalizeToolCallIds({
      messages: cachedModelMessages,
      modelId,
      providerId,
    }),
  );
}
