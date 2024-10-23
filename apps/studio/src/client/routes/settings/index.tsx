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
import { rpcClient } from "@/client/rpc/client";
import { isFeatureEnabled } from "@/shared/features";
import { QuestsLogoIcon } from "@quests/components/logo";
import { RELEASE_NOTES_URL } from "@quests/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/")({
  component: SettingsGeneralPage,
});

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

  const handleCheckForUpdates = async () => {
    await checkForUpdatesMutation.mutateAsync(
      {},
      {
        onError: () => {
          toast.error("Failed to check for updates", {
            position: "bottom-center",
          });
        },
        onSuccess: () => {
          toast.success("Checked for updates successfully", {
            position: "bottom-center",
          });
        },
      },
    );
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

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">About</h3>
      </div>
      <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                Version{" "}
                {isLoadingVersion
                  ? "Loading..."
                  : appVersion?.version || "Unknown"}
              </div>
              {lastChecked && (
                <div className="text-sm text-muted-foreground">
                  Last checked for updates on {formatLastChecked(lastChecked)}.
                </div>
              )}
            </div>
            <Button
              disabled={checkForUpdatesMutation.isPending}
              onClick={handleCheckForUpdates}
            >
              {checkForUpdatesMutation.isPending
                ? "Checking..."
                : "Check for Updates"}
            </Button>
          </div>
          <div>
            <Button
              className="p-0 h-auto text-blue-600 dark:text-blue-400"
              onClick={() => {
                window.open(RELEASE_NOTES_URL, "_blank");
              }}
              variant="link"
            >
              Release Notes
            </Button>
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
  const { mutate: tabsAdd } = useMutation(rpcClient.tabs.add.mutationOptions());
  const user = userResult.data;

  if (!user?.id) {
    return (
      <div className="py-4 text-center">
        <Button
          className="h-10 [&_svg]:size-6 px-24"
          onClick={() => {
            tabsAdd({ urlPath: "/login" });
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
