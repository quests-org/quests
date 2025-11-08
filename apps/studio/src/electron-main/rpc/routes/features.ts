import { startAuthCallbackServer } from "@/electron-main/auth/server";
import { stopAuthServer } from "@/electron-main/auth/state";
import { getFeaturesStore } from "@/electron-main/stores/features";
import { FeatureNameSchema, FeaturesSchema } from "@/shared/features";
import { call, eventIterator } from "@orpc/server";
import { z } from "zod";

import { base } from "../base";
import { publisher } from "../publisher";

const getAll = base.output(FeaturesSchema).handler(() => {
  const store = getFeaturesStore();
  return store.store;
});

const setEnabled = base
  .input(z.object({ enabled: z.boolean(), feature: FeatureNameSchema }))
  .handler(({ input }) => {
    const store = getFeaturesStore();
    store.set(input.feature, input.enabled);

    if (input.feature === "questsAccounts") {
      if (input.enabled) {
        void startAuthCallbackServer();
      } else {
        stopAuthServer();
      }
    }
  });

const live = {
  getAll: base.output(eventIterator(FeaturesSchema)).handler(async function* ({
    context,
    signal,
  }) {
    yield call(getAll, {}, { context, signal });

    for await (const _ of publisher.subscribe("features.updated", {
      signal,
    })) {
      yield call(getAll, {}, { context, signal });
    }
  }),
};

export const features = {
  getAll,
  live,
  setEnabled,
};
