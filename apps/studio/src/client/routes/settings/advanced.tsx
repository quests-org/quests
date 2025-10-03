import { Label } from "@/client/components/ui/label";
import { Switch } from "@/client/components/ui/switch";
import { isLinux } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { APP_REPO_URL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/advanced")({
  component: SettingsAdvancedPage,
});

function SafeStorage() {
  const { data: safeStorageInfo } = useQuery(
    rpcClient.provider.safeStorageInfo.queryOptions(),
  );

  if (!safeStorageInfo) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Secure Storage</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI provider API keys are stored using system secure storage.
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Encryption Available
          </span>
          <span
            className={`text-sm font-medium ${safeStorageInfo.isAvailable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {safeStorageInfo.isAvailable ? "Yes" : "No"}
          </span>
        </div>
        {safeStorageInfo.backend && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Storage Backend
            </span>
            <span className="text-sm font-medium font-mono">
              {safeStorageInfo.backend}
            </span>
          </div>
        )}
        {safeStorageInfo.backend === "basic_text" && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Your API keys are stored with basic encryption. For better
              security, configure a password manager like gnome-libsecret or
              kwallet on your system.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsAdvancedPage() {
  return (
    <div className="space-y-4">
      <UsageMetrics />
      {isLinux() && <SafeStorage />}
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
                className="text-blue-600 dark:text-blue-400 hover:underline"
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
