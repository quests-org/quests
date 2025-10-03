import type { FeatureName } from "@/shared/features";

import { logger } from "@/client/lib/logger";
import { vanillaRpcClient } from "@/client/rpc/client";
import { atom } from "jotai";
import { atomWithRefresh, loadable } from "jotai/utils";

type Features = Record<FeatureName, boolean>;

const defaultFeatures: Features = {
  evals: false,
  questsAccounts: false,
};

async function listen(setAtom: () => void) {
  const iterator = await vanillaRpcClient.features.live.getAll();
  for await (const _payload of iterator) {
    setAtom();
  }
}

const baseFeaturesAtom = atomWithRefresh(async () => {
  try {
    return await vanillaRpcClient.features.getAll();
  } catch (error) {
    logger.error(`Error fetching features`, error);
    return defaultFeatures;
  }
});

baseFeaturesAtom.onMount = (setAtom) => {
  listen(setAtom).catch((error: unknown) => {
    logger.error(`Error listening to features updated`, error);
  });
};

const loadableFeaturesAtom = loadable(baseFeaturesAtom);

// Avoids suspense when accessing features
export const featuresAtom = atom<Features>((get) => {
  const loadableData = get(loadableFeaturesAtom);
  if (loadableData.state === "hasData") {
    return loadableData.data;
  }
  return defaultFeatures;
});
