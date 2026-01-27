import { type AIGatewayModel } from "@quests/ai-gateway";
import { differenceInMinutes } from "date-fns";
import { ok, Result } from "neverthrow";
import { alphabetical } from "radashi";

import { type AnyAgent } from "../agents/types";
import { SessionMessage } from "../schemas/session/message";
import { type StoreId } from "../schemas/store-id";
import { ALL_AI_SDK_TOOLS } from "../tools/all";
import { addCacheControlToMessages } from "./add-cache-control";
import { type AppConfig } from "./app-config/types";
import { filterUnsupportedMedia } from "./filter-unsupported-media";
import { normalizeToolCallIds } from "./normalize-tool-call-ids";
import { splitMultipartToolResults } from "./split-multipart-tool-results";
import { Store } from "./store";

const STALE_MESSAGE_THRESHOLD_MINUTES = 60;

export async function prepareModelMessages({
  agent,
  appConfig,
  model,
  sessionId,
  signal,
}: {
  agent: AnyAgent;
  appConfig: AppConfig;
  model: AIGatewayModel.Type;
  sessionId: StoreId.Session;
  signal: AbortSignal;
}) {
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
      // Old messages can have old agent names, so we need to check for that
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

  const nonEmptyModelMessages = modelMessages.filter(
    (message) => message.content.length > 0 || Boolean(message.providerOptions),
  );

  // AI SDK requires system messages to be first for some providers
  const modelMessagesWithSystemFirst = nonEmptyModelMessages.sort((a, b) =>
    a.role === "system" ? -1 : b.role === "system" ? 1 : 0,
  );

  const splitMessages = splitMultipartToolResults({
    messages: modelMessagesWithSystemFirst,
    provider: model.params.provider,
  });

  const filteredMessages = filterUnsupportedMedia({
    messages: splitMessages,
    model,
  });

  const cachedModelMessages = addCacheControlToMessages({
    messages: filteredMessages,
    model,
  });

  return ok(
    normalizeToolCallIds({
      messages: cachedModelMessages,
      model,
    }),
  );
}
