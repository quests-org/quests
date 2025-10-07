import type { FeatureName } from "@/shared/features";

import { atomWithoutSuspense } from "@/client/lib/atom-without-suspense";
import { logger } from "@/client/lib/logger";
import { vanillaRpcClient } from "@/client/rpc/client";
import { atomWithRefresh } from "jotai/utils";

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

export const featuresAtom = atomWithoutSuspense(
  baseFeaturesAtom,
  defaultFeatures,
);
