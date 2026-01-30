import { atomWithoutSuspense } from "@/client/lib/atom-without-suspense";
import { logger } from "@/client/lib/logger";
import { rpcClient } from "@/client/rpc/client";
import { type ProviderMetadata } from "@quests/ai-gateway/client";
import { type AIProviderType } from "@quests/shared";
import { atom } from "jotai";
import { sort } from "radashi";

interface ProviderMetadataData {
  providerMetadataMap: Map<AIProviderType, ProviderMetadata>;
  sortedProviderMetadata: ProviderMetadata[];
}

const defaultProviderMetadata: ProviderMetadataData = {
  providerMetadataMap: new Map(),
  sortedProviderMetadata: [],
};

const baseProviderMetadataAtom = atom(async () => {
  try {
    const list = await rpcClient.providerConfig.metadata.list.call();
    const metadataMap = new Map(list.map((item) => [item.type, item]));

    return {
      providerMetadataMap: metadataMap,
      sortedProviderMetadata: sort(
        [...metadataMap.values()],
        (metadata) => {
          // OpenAI compatible provider should be at the bottom
          if (metadata.type === "openai-compatible") {
            return -1;
          }
          return Number(metadata.tags.includes("recommended"));
        },
        true,
      ),
    };
  } catch (error) {
    logger.error(`Error fetching provider metadata`, error);
    return defaultProviderMetadata;
  }
});

export const providerMetadataAtom = atomWithoutSuspense(
  baseProviderMetadataAtom,
  defaultProviderMetadata,
);
