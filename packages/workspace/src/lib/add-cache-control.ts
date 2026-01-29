import type { AIGatewayModel } from "@quests/ai-gateway";
import type { ModelMessage } from "ai";

import { unique } from "radashi";

import { isAnthropic } from "./is-anthropic";

// Apply cache control for Anthropic models
// Read https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
// to understand why we're placing the cache control options the way we are
// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/provider/transform.ts
export function addCacheControlToMessages({
  messages,
  model,
}: {
  messages: ModelMessage[];
  model: AIGatewayModel.Type;
}) {
  if (isAnthropic(model)) {
    const system = messages
      .filter((message) => message.role === "system")
      .slice(0, 2);
    const final = messages
      .filter((message) => message.role !== "system")
      .slice(-2);

    const providerOptions = {
      anthropic: {
        cacheControl: { type: "ephemeral" },
      },
      bedrock: {
        cachePoint: { type: "ephemeral" },
      },
      openaiCompatible: {
        cache_control: { type: "ephemeral" },
      },
      openrouter: {
        cache_control: { type: "ephemeral" },
      },
    };

    for (const message of unique([...system, ...final])) {
      const shouldUseContentOptions =
        model.params.provider !== "anthropic" &&
        Array.isArray(message.content) &&
        message.content.length > 0;

      if (shouldUseContentOptions) {
        const lastContent = message.content.at(-1);
        if (
          lastContent &&
          typeof lastContent === "object" &&
          "type" in lastContent &&
          lastContent.type !== "tool-approval-request" &&
          lastContent.type !== "tool-approval-response"
        ) {
          lastContent.providerOptions = {
            ...lastContent.providerOptions,
            ...providerOptions,
          };
          continue;
        }
      }

      message.providerOptions = {
        ...message.providerOptions,
        ...providerOptions,
      };
    }
  }
  return messages;
}
