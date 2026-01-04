import type { Features } from "@/shared/features";

import { atomWithoutSuspense } from "@/client/lib/atom-without-suspense";
import { logger } from "@/client/lib/logger";
import { rpcClient } from "@/client/rpc/client";
import { atomWithRefresh } from "jotai/utils";

const defaultFeatures: Features = {
  browser: false,
};

async function listen(setAtom: () => void) {
  const iterator = await rpcClient.features.live.getAll.call();
  for await (const _payload of iterator) {
    setAtom();
  }
}

const baseFeaturesAtom = atomWithRefresh(async () => {
  try {
    return await rpcClient.features.getAll.call();
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
