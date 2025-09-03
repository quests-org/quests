import { type ModelMessage } from "ai";

import { SessionMessage } from "../schemas/session/message";
import { ALL_AI_SDK_TOOLS } from "../tools/all";
import { addCacheControlToMessages } from "./add-cache-control";
import { normalizeToolCallIds } from "./normalize-tool-call-ids";

export function prepareModelMessages({
  agentMessages,
  modelId,
  providerId,
  sessionMessages,
}: {
  agentMessages: ModelMessage[];
  modelId: string;
  providerId: string;
  sessionMessages: SessionMessage.WithParts[];
}) {
  const modelMessages = [
    ...agentMessages,
    // Including all tools so they can run their toModelOutput even if they
    // are not used in this session
    ...SessionMessage.toModelMessages(sessionMessages, ALL_AI_SDK_TOOLS),
  ];

  const cachedModelMessages = addCacheControlToMessages({
    messages: modelMessages,
    modelId,
    providerId,
  });

  return normalizeToolCallIds({
    messages: cachedModelMessages,
    modelId,
    providerId,
  });
}
