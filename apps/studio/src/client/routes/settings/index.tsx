import { AccountInfo } from "@/client/components/account-info";
import { ExternalLink } from "@/client/components/external-link";
import { ThemeToggle } from "@/client/components/theme-toggle";
import { Button } from "@/client/components/ui/button";
import { Label } from "@/client/components/ui/label";
import { Progress } from "@/client/components/ui/progress";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { isLinux } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { APP_REPO_URL, DISCORD_URL, MANUAL_DOWNLOAD_URL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

export const Route = createFileRoute("/settings/")({
  component: SettingsGeneralPage,
});

const handleInstallUpdate = () => {
  try {
    void rpcClient.preferences.quitAndInstall.call();
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

  const { addTab } = useTabActions();
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
            <div className="text-right text-xs text-muted-foreground">
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
      case "available":
      case "checking":
      case "downloading": {
        return (
          <Button disabled>
            {updateState.type === "checking" && "Checking..."}
            {updateState.type === "downloading" && "Downloading..."}
            {updateState.type === "available" && "Preparing..."}
          </Button>
        );
      }
      case "cancelled": {
        return (
          <Button onClick={handleCheckForUpdates} variant="secondary">
            Try again
          </Button>
        );
      }
      case "downloaded": {
        return <Button onClick={handleInstallUpdate}>Install now</Button>;
      }
      case "error": {
        return (
          <div className="flex gap-2">
            <Button onClick={handleCheckForUpdates} variant="ghost">
              Try again
            </Button>
            <Button asChild variant="outline">
              <ExternalLink
                href={`${MANUAL_DOWNLOAD_URL}?ref=studio-settings-error`}
              >
                Download manually
              </ExternalLink>
            </Button>
          </div>
        );
      }
      case "installing": {
        return <Button disabled>Installing...</Button>;
      }
      default: {
        return (
          <Button
            disabled={checkForUpdatesMutation.isPending}
            onClick={handleCheckForUpdates}
            variant="secondary"
          >
            {checkForUpdatesMutation.isPending
              ? "Checking..."
              : "Check for updates"}
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
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-sm font-medium">
                Version{" "}
                {isLoadingVersion
                  ? "Loading..."
                  : appVersion?.version || "Unknown"}
              </div>
              <Button
                className="h-auto p-0 text-blue-600 dark:text-blue-400"
                onClick={() => {
                  void addTab({ to: "/release-notes" });
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
              Quests is open source and free to use. You can view the source
              code on GitHub.
            </p>
            <div>
              <Button
                asChild
                className="h-auto px-0! text-blue-600 dark:text-blue-400"
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
              Join us on Discord so you can tell us how much you like Quests.
              Definitely not to yell at us about bugs. Definitely.
            </p>
            <div>
              <Button
                asChild
                className="h-auto px-0! text-blue-600 dark:text-blue-400"
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
      <AccountInfo />
      <InterfaceAndTheme />
      <About />
    </div>
  );
}
