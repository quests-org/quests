import { featuresAtom } from "@/client/atoms/features";
import { Label } from "@/client/components/ui/label";
import { Switch } from "@/client/components/ui/switch";
import { vanillaRpcClient } from "@/client/rpc/client";
import { type FeatureName } from "@/shared/features";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings/features")({
  component: SettingsFeaturesPage,
});

const featureDescriptions: Record<
  FeatureName,
  { description: string; title: string }
> = {
  createInNewTab: {
    description: "Enable the 'Create in new tab' checkbox on the new tab page.",
    title: "Create in New Tab",
  },
  evals: {
    description: "Enable the evaluations page and sidebar item.",
    title: "Evaluations",
  },
  questsAccounts: {
    description: "Enable Quests accounts.",
    title: "Quests Accounts",
  },
};

function SettingsFeaturesPage() {
  const features = useAtomValue(featuresAtom);
  const [optimisticFeatures, setOptimisticFeatures] =
    useState<Record<FeatureName, boolean>>(features);

  useEffect(() => {
    setOptimisticFeatures(features);
  }, [features]);

  const handleToggle = async (feature: FeatureName, enabled: boolean) => {
    setOptimisticFeatures((prev) => ({ ...prev, [feature]: enabled }));

    try {
      await vanillaRpcClient.features.setEnabled({ enabled, feature });
    } catch {
      setOptimisticFeatures(features);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Feature Flags</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Enable or disable experimental features. Changes take effect
          immediately.
        </p>
      </div>

      <div className="space-y-4">
        {(
          Object.entries(featureDescriptions) as [
            FeatureName,
            (typeof featureDescriptions)[FeatureName],
          ][]
        ).map(([feature, { description, title }]) => (
          <div
            className="flex items-start justify-between gap-4 rounded-lg border bg-accent/30 p-4 shadow-sm"
            key={feature}
          >
            <div className="space-y-1 flex-1">
              <Label className="text-sm font-medium" htmlFor={feature}>
                {title}
              </Label>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={optimisticFeatures[feature]}
              id={feature}
              onCheckedChange={(checked) => {
                void handleToggle(feature, checked);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
