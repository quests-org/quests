import { featuresAtom } from "@/client/atoms/features";
import { Label } from "@/client/components/ui/label";
import { Switch } from "@/client/components/ui/switch";
import { vanillaRpcClient } from "@/client/rpc/client";
import { FEATURE_METADATA, type FeatureName } from "@/shared/features";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings/features")({
  component: SettingsFeaturesPage,
});

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
        <p className="mt-1 text-sm text-muted-foreground">
          Enable or disable experimental features. Changes take effect
          immediately.
        </p>
      </div>

      <div className="space-y-4">
        {(
          Object.entries(FEATURE_METADATA) as [
            FeatureName,
            (typeof FEATURE_METADATA)[FeatureName],
          ][]
        ).map(([feature, { description, title }]) => (
          <div
            className="flex items-start justify-between gap-4 rounded-lg border bg-accent/30 p-4 shadow-sm"
            key={feature}
          >
            <div className="flex-1 space-y-1">
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
