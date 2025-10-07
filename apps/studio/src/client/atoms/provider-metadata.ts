import { atomWithoutSuspense } from "@/client/lib/atom-without-suspense";
import { logger } from "@/client/lib/logger";
import { vanillaRpcClient } from "@/client/rpc/client";
import {
  type AIGatewayProvider,
  type ProviderMetadata,
  RECOMMENDED_TAG,
} from "@quests/ai-gateway/client";
import { atom } from "jotai";
import { sort } from "radashi";

interface ProviderMetadataData {
  providerMetadataMap: Map<
    AIGatewayProvider.Type["type"],
    ProviderMetadata & { type: AIGatewayProvider.Type["type"] }
  >;
  sortedProviderMetadata: (ProviderMetadata & {
    type: AIGatewayProvider.Type["type"];
  })[];
}

const defaultProviderMetadata: ProviderMetadataData = {
  providerMetadataMap: new Map(),
  sortedProviderMetadata: [],
};

const baseProviderMetadataAtom = atom(async () => {
  try {
    const list = await vanillaRpcClient.provider.metadata.list();
    const metadataMap = new Map(list.map((item) => [item.type, item]));

    return {
      providerMetadataMap: metadataMap,
      sortedProviderMetadata: sort(
        [...metadataMap.values()],
        (metadata) => Number(metadata.tags.includes(RECOMMENDED_TAG)),
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
