import { logger } from "@/client/lib/logger";
import { vanillaRpcClient } from "@/client/rpc/client";
import { atomWithRefresh } from "jotai/utils";

async function listen(setAtom: () => void) {
  const iterator = await vanillaRpcClient.providerConfig.live.list();
  for await (const _payload of iterator) {
    setAtom();
  }
}

export const hasAIProviderConfigAtom = atomWithRefresh(async () => {
  try {
    return await vanillaRpcClient.user.hasAIProviderConfig();
  } catch (error) {
    logger.error(`Error listening to auth session changed`, error);
    return false;
  }
});

hasAIProviderConfigAtom.onMount = (setAtom) => {
  listen(setAtom).catch((error: unknown) => {
    logger.error(`Error listening to auth session changed`, error);
  });
};
