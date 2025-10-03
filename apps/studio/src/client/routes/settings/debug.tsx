import { isLinux } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/debug")({
  component: SettingsDebugPage,
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

function SettingsDebugPage() {
  return <div className="space-y-4">{isLinux() && <SafeStorage />}</div>;
}
