import { userAtom } from "@/client/atoms/user";
import { ThemeToggle } from "@/client/components/theme-toggle";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Label } from "@/client/components/ui/label";
import { Progress } from "@/client/components/ui/progress";
import { isLinux } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { isFeatureEnabled } from "@/shared/features";
import { QuestsLogoIcon } from "@quests/components/logo";
import { APP_REPO_URL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { Download, ExternalLink } from "lucide-react";

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

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
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
            <div className="flex-shrink-0">{getActionButton()}</div>
          </div>
          <div className="mt-3">{getUpdateStatusContent()}</div>
        </div>
        <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-medium">Open Source</div>
            <p className="text-sm text-muted-foreground">
              Quests is open source and available on GitHub.
            </p>
            <div>
              <Button
                className="!px-0 h-auto text-blue-600 dark:text-blue-400"
                onClick={() => {
                  void openExternalLinkMutation.mutateAsync({
                    url: APP_REPO_URL,
                  });
                }}
                variant="link"
              >
                View Source on GitHub
                <ExternalLink className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Account() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Account</h3>
      </div>
      <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Quests Account</h4>
            <p className="text-sm text-muted-foreground">
              Your Quests account gives you access to AI models and credits.
            </p>
          </div>
          <UserInfoList />
        </div>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
      {isFeatureEnabled("questsAccounts") && <Account />}
      <InterfaceAndTheme />
      <About />
    </div>
  );
}

function UserInfoList() {
  const [userResult] = useAtom(userAtom);
  const { data: creditsData } = useQuery(rpcClient.user.credits.queryOptions());
  const { mutateAsync: signOut } = useMutation(
    rpcClient.auth.signOut.mutationOptions(),
  );
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();
  const user = userResult.data;

  if (!user?.id) {
    return (
      <div className="py-4 text-center">
        <Button
          className="h-10 [&_svg]:size-6 px-24"
          onClick={() => {
            const location = router.buildLocation({
              to: "/login",
            });
            addTab({ urlPath: location.href });
            window.close();
          }}
          variant="secondary"
        >
          <div>
            <QuestsLogoIcon />
          </div>
          Sign in to your Quests account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-4 p-3 pr-6 rounded-lg border bg-accent/50">
        <Avatar className="h-12 w-12">
          <AvatarImage alt={user.name} src={user.image || undefined} />
          <AvatarFallback className="text-sm font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{user.name}</h4>
            <Badge className="text-xs px-2 py-0.5" variant="secondary">
              Early Access
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ${((creditsData?.credits ?? 0) / 100).toFixed(2)} free credits
            remaining
          </p>
        </div>
      </div>
      <div>
        <Button
          onClick={async () => {
            await signOut({});
          }}
          variant="outline"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
