import { Label } from "@/client/components/ui/label";
import { Switch } from "@/client/components/ui/switch";
import { rpcClient } from "@/client/rpc/client";
import { APP_REPO_URL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/advanced")({
  component: SettingsAdvancedPage,
});

function SettingsAdvancedPage() {
  return (
    <div className="space-y-4">
      <UsageMetrics />
    </div>
  );
}

function UsageMetrics() {
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );

  const setUsageMetricsMutation = useMutation(
    rpcClient.preferences.setEnableUsageMetrics.mutationOptions(),
  );

  const handleToggleUsageMetrics = async (checked: boolean) => {
    try {
      await setUsageMetricsMutation.mutateAsync({ enabled: checked });
      toast.success(
        checked ? "Usage metrics enabled" : "Usage metrics disabled",
        {
          position: "bottom-center",
        },
      );
    } catch {
      toast.error("Failed to update usage metrics preference", {
        position: "bottom-center",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Usage</h3>
      </div>
      <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={preferences?.enableUsageMetrics || false}
              disabled={setUsageMetricsMutation.isPending}
              id="usage-metrics"
              onCheckedChange={handleToggleUsageMetrics}
            />
            <Label className="inline" htmlFor="usage-metrics">
              Help Quests improve by submitting anonymous{" "}
              <a
                className="text-blue-600 hover:underline dark:text-blue-400"
                href={`${APP_REPO_URL}/blob/main/docs/usage-metrics.md`}
                rel="noopener noreferrer"
                target="_blank"
              >
                usage metrics
              </a>
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
