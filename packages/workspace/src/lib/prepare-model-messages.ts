import { envForProviders } from "@quests/ai-gateway";
import { differenceInMinutes } from "date-fns";
import { ok, Result } from "neverthrow";
import { alphabetical } from "radashi";

import { type AnyAgent } from "../agents/types";
import { getWorkspaceServerURL } from "../logic/server/url";
import { SessionMessage } from "../schemas/session/message";
import { type StoreId } from "../schemas/store-id";
import { ALL_AI_SDK_TOOLS } from "../tools/all";
import { addCacheControlToMessages } from "./add-cache-control";
import { type AppConfig } from "./app-config/types";
import { normalizeToolCallIds } from "./normalize-tool-call-ids";
import { Store } from "./store";

const STALE_MESSAGE_THRESHOLD_MINUTES = 60;

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
  const env = envForProviders({
    configs: appConfig.workspaceConfig.getAIProviderConfigs(),
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

  function isSessionContextMessage(
    message: SessionMessage.WithParts,
  ): message is SessionMessage.ContextWithParts {
    return (
      message.role === "session-context" &&
      message.metadata.agentName === agent.name
    );
  }

  const existingSessionContextMessages = messages.filter(
    isSessionContextMessage,
  );

  const nonContextMessages = messages.filter(
    (message) => !isSessionContextMessage(message),
  );

  let contextMessages: SessionMessage.ContextWithParts[];

  async function createAndSaveContextMessages() {
    const newContextMessages = await agent.getMessages({
      appConfig,
      envVariableNames: Object.keys(env),
      sessionId,
    });

    const saveResults = await Promise.all(
      newContextMessages.map((message) =>
        Store.saveMessageWithParts(message, appConfig, { signal }),
      ),
    );

    const combinedResult = Result.combine(saveResults);
    if (combinedResult.isErr()) {
      return combinedResult;
    }

    return ok(newContextMessages);
  }

  if (existingSessionContextMessages.length > 0) {
    const now = new Date();
    const hasStaleMessage = existingSessionContextMessages.some(
      (message) =>
        differenceInMinutes(now, message.metadata.createdAt) >
        STALE_MESSAGE_THRESHOLD_MINUTES,
    );

    if (hasStaleMessage) {
      for (const existingMessage of existingSessionContextMessages) {
        const removeResult = await Store.removeMessage(
          existingMessage.id,
          existingMessage.metadata.sessionId,
          appConfig,
          { signal },
        );

        if (removeResult.isErr()) {
          return removeResult;
        }
      }

      const createResult = await createAndSaveContextMessages();
      if (createResult.isErr()) {
        return createResult;
      }
      contextMessages = createResult.value;
    } else {
      contextMessages = existingSessionContextMessages;
    }
  } else {
    const createResult = await createAndSaveContextMessages();
    if (createResult.isErr()) {
      return createResult;
    }
    contextMessages = createResult.value;
  }

  const orderedMessages = [
    // ulid sorts oldest to newest
    ...alphabetical(contextMessages, (message) => message.id),
    ...alphabetical(nonContextMessages, (message) => message.id),
  ];

  // Including all tools so they can run their toModelOutput even if they are
  // not used in this session
  const modelMessages = SessionMessage.toModelMessages(
    orderedMessages,
    ALL_AI_SDK_TOOLS,
  );

  // AI SDK requires system messages to be first for some providers
  const modelMessagesWithSystemFirst = modelMessages.sort((a, b) =>
    a.role === "system" ? -1 : b.role === "system" ? 1 : 0,
  );

  const cachedModelMessages = addCacheControlToMessages({
    messages: modelMessagesWithSystemFirst,
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
