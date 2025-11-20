import { ExternalLink } from "@/client/components/external-link";
import { ThemeToggle } from "@/client/components/theme-toggle";
import { Button } from "@/client/components/ui/button";
import { Label } from "@/client/components/ui/label";
import { Progress } from "@/client/components/ui/progress";
import { isLinux } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { APP_REPO_URL, DISCORD_URL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Download, ExternalLink as ExternalLinkIcon } from "lucide-react";

export const Route = createFileRoute("/settings/")({
  component: SettingsGeneralPage,
});

const handleInstallUpdate = () => {
  try {
    void vanillaRpcClient.preferences.quitAndInstall();
  } catch {
    // Handle error silently as per original implementation
  }
};

function About() {
  const { data: appVersion, isLoading: isLoadingVersion } = useQuery(
    rpcClient.preferences.getAppVersion.queryOptions(),
  );

  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );

  const checkForUpdatesMutation = useMutation(
    rpcClient.preferences.checkForUpdates.mutationOptions(),
  );

  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();
  const { data: updateState } = useQuery(
    rpcClient.updates.live.status.experimental_liveOptions(),
  );

  const handleCheckForUpdates = async () => {
    await checkForUpdatesMutation.mutateAsync({
      notify: false,
    });
  };

  const formatLastChecked = (date: Date) => {
    return (
      date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) +
      " at " +
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
        minute: "2-digit",
      })
    );
  };

  const lastChecked = preferences?.lastUpdateCheck
    ? new Date(preferences.lastUpdateCheck)
    : null;

  const getUpdateStatusContent = () => {
    switch (updateState?.type) {
      case "available": {
        return (
          <div className="text-sm text-muted-foreground">
            Version {updateState.updateInfo?.version ?? ""} is available.
            Downloading...
          </div>
        );
      }
      case "cancelled": {
        return (
          <div className="text-sm text-muted-foreground">
            Update to version {updateState.updateInfo?.version} was cancelled
          </div>
        );
      }
      case "checking": {
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Checking for updates...
            </div>
          </div>
        );
      }
      case "downloaded": {
        return (
          <div className="text-sm text-muted-foreground">
            {isLinux()
              ? `Version ${updateState.updateInfo?.version ?? ""} is
            ready to install. Please allow a few minutes for the update to install. The app will relaunch when complete.`
              : `Version ${updateState.updateInfo?.version ?? ""} is
            ready to install.`}
          </div>
        );
      }
      case "downloading": {
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Downloading update...
            </div>
            <Progress
              className="h-1 w-full"
              value={updateState.progress.percent}
            />
            <div className="text-xs text-muted-foreground text-right">
              {updateState.progress.percent.toFixed(0)}%
            </div>
          </div>
        );
      }
      case "error": {
        return (
          <div className="text-sm text-destructive">
            Update failed: {updateState.message.slice(0, 100)}
            {updateState.message.length > 100 ? "..." : ""}
          </div>
        );
      }
      case "inactive": {
        return (
          <div className="text-sm text-muted-foreground">
            The app is running in development mode. Updates are not available.
          </div>
        );
      }
      case "installing": {
        return (
          <div className="text-sm text-muted-foreground">
            {updateState.notice ?? "Update is installing..."}
          </div>
        );
      }
      case "not-available": {
        return (
          <div className="text-sm text-muted-foreground">
            No updates available
          </div>
        );
      }
      default: {
        return lastChecked ? (
          <div className="text-sm text-muted-foreground">
            Last checked for updates on {formatLastChecked(lastChecked)}.
          </div>
        ) : null;
      }
    }
  };

  const getActionButton = () => {
    switch (updateState?.type) {
      case "checking":
      case "downloading": {
        return (
          <Button disabled>
            {updateState.type === "checking" ? "Checking..." : "Downloading..."}
          </Button>
        );
      }
      case "downloaded": {
        return (
          <Button onClick={handleInstallUpdate}>
            <Download className="h-4 w-4" />
            Install Now
          </Button>
        );
      }
      case "error": {
        return (
          <Button
            onClick={() => {
              window.open("https://quests.dev/download", "_blank");
            }}
            variant="outline"
          >
            Download Manually
          </Button>
        );
      }
      default: {
        return (
          <Button
            disabled={checkForUpdatesMutation.isPending}
            onClick={handleCheckForUpdates}
          >
            {checkForUpdatesMutation.isPending
              ? "Checking..."
              : "Check for Updates"}
          </Button>
        );
      }
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">About</h3>
      </div>
      <div className="space-y-3">
        <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="text-sm font-medium">
                Version{" "}
                {isLoadingVersion
                  ? "Loading..."
                  : appVersion?.version || "Unknown"}
              </div>
              <Button
                className="p-0 h-auto text-blue-600 dark:text-blue-400"
                onClick={() => {
                  const location = router.buildLocation({
                    to: "/release-notes",
                  });
                  addTab({ urlPath: location.href });
                  window.close();
                }}
                variant="link"
              >
                Release Notes
              </Button>
            </div>
            <div className="shrink-0">{getActionButton()}</div>
          </div>
          <div className="mt-3">{getUpdateStatusContent()}</div>
        </div>
        <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium">Open Source</div>
            <p className="text-sm text-muted-foreground">
              You can look at the source code and see how this whole thingamajig
              works. You could even contribute a feature or bug fix! No
              pressure.
            </p>
            <div>
              <Button
                asChild
                className="px-0! h-auto text-blue-600 dark:text-blue-400"
                variant="link"
              >
                <ExternalLink href={APP_REPO_URL}>
                  View Source on GitHub
                  <ExternalLinkIcon className="size-3" />
                </ExternalLink>
              </Button>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium">Community</div>
            <p className="text-sm text-muted-foreground">
              We&lsquo;ve got a Discord server so you can tell us how much you
              like Quests. Definitely not to yell at us about bugs. Definitely.
            </p>
            <div>
              <Button
                asChild
                className="px-0! h-auto text-blue-600 dark:text-blue-400"
                variant="link"
              >
                <ExternalLink href={DISCORD_URL}>
                  Join us on Discord
                  <ExternalLinkIcon className="size-3" />
                </ExternalLink>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterfaceAndTheme() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Interface</h3>
      </div>
      <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme-toggle">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred color scheme.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsGeneralPage() {
  return (
    <div className="space-y-4">
      <InterfaceAndTheme />
      <About />
    </div>
  );
}
