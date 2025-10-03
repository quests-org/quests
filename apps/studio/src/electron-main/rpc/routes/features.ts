import {
  type FeatureName,
  getFeaturesStore,
} from "@/electron-main/stores/features";
import { call, eventIterator } from "@orpc/server";
import { z } from "zod";

import { base } from "../base";
import { publisher } from "../publisher";

const FeatureNameSchema = z.enum(["evals", "questsAccounts"]);

const FeaturesSchema = z.object({
  evals: z.boolean(),
  questsAccounts: z.boolean(),
});

const isEnabled = base
  .input(z.object({ feature: FeatureNameSchema }))
  .output(z.boolean())
  .handler(({ input }) => {
    const store = getFeaturesStore();
    return store.get(input.feature);
  });

const getAll = base.output(FeaturesSchema).handler(() => {
  const store = getFeaturesStore();
  return store.store as Record<FeatureName, boolean>;
});

const setEnabled = base
  .input(z.object({ enabled: z.boolean(), feature: FeatureNameSchema }))
  .handler(({ input }) => {
    const store = getFeaturesStore();
    store.set(input.feature, input.enabled);
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
  isEnabled,
  live,
  setEnabled,
};
