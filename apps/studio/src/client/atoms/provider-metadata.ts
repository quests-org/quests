import { atomWithoutSuspense } from "@/client/lib/atom-without-suspense";
import { logger } from "@/client/lib/logger";
import { vanillaRpcClient } from "@/client/rpc/client";
import {
  type ProviderMetadata,
  RECOMMENDED_TAG,
} from "@quests/ai-gateway/client";
import { type AIProviderType } from "@quests/shared";
import { atom } from "jotai";
import { sort } from "radashi";

interface ProviderMetadataData {
  providerMetadataMap: Map<
    AIProviderType,
    ProviderMetadata & { type: AIProviderType }
  >;
  sortedProviderMetadata: (ProviderMetadata & {
    type: AIProviderType;
  })[];
}

const defaultProviderMetadata: ProviderMetadataData = {
  providerMetadataMap: new Map(),
  sortedProviderMetadata: [],
};

const baseProviderMetadataAtom = atom(async () => {
  try {
    const list = await vanillaRpcClient.providerConfig.metadata.list();
    const metadataMap = new Map(list.map((item) => [item.type, item]));

    return {
      providerMetadataMap: metadataMap,
      sortedProviderMetadata: sort(
        [...metadataMap.values()],
        (metadata) => {
          if (metadata.type === "openai-compatible") {
            return -1;
          }
          return Number(metadata.tags.includes(RECOMMENDED_TAG));
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
