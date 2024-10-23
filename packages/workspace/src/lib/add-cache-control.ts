import type { ModelMessage } from "ai";

import { unique } from "radashi";

// Apply cache control for Anthropic models
// Read https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
// to understand why we're placing the cache control options the way we are
// Adapted from
// https://github.com/sst/opencode/blob/dev/packages/opencode/src/provider/transform.ts
export function addCacheControlToMessages(
  msgs: ModelMessage[],
  providerID: string,
  modelID: string,
) {
  if (
    providerID === "anthropic" ||
    modelID.includes("anthropic") ||
    modelID.includes("claude")
  ) {
    const system = msgs.filter((msg) => msg.role === "system").slice(0, 2);
    const final = msgs.filter((msg) => msg.role !== "system").slice(-2);

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

    for (const msg of unique([...system, ...final])) {
      const shouldUseContentOptions =
        providerID !== "anthropic" &&
        Array.isArray(msg.content) &&
        msg.content.length > 0;

      if (shouldUseContentOptions) {
        const lastContent = msg.content.at(-1);
        if (lastContent && typeof lastContent === "object") {
          lastContent.providerOptions = {
            ...lastContent.providerOptions,
            ...providerOptions,
          };
          continue;
        }
      }

      msg.providerOptions = {
        ...msg.providerOptions,
        ...providerOptions,
      };
    }
  }
  return msgs;
}
