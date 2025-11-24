import { userAtom } from "@/client/atoms/user";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { getInitials } from "@/client/lib/get-initials";
import { rpcClient } from "@/client/rpc/client";
import { QuestsLogoIcon } from "@quests/components/logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { GemIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/account")({
  component: SettingsAccountPage,
});

function SettingsAccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and subscription.
        </p>
      </div>
      <UserInfoList />
    </div>
  );
}

function UserInfoList() {
  const [userResult] = useAtom(userAtom);
  const { data: subscriptionData, error: subscriptionError } = useQuery(
    rpcClient.user.subscription.queryOptions(),
  );
  const { mutateAsync: signOut } = useMutation(
    rpcClient.auth.signOut.mutationOptions({}),
  );
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const { mutateAsync: createPortalSession } = useMutation(
    rpcClient.stripe.createPortalSession.mutationOptions(),
  );
  const { mutateAsync: openExternalLink } = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );
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

  const handleManageSubscription = async () => {
    try {
      const { data } = await createPortalSession({});
      if (data?.url) {
        await openExternalLink({ url: data.url });
      } else {
        toast.error("Failed to create portal session");
      }
    } catch {
      toast.error("Failed to create portal session");
    }
  };

  const data = subscriptionData?.data;
  const plan = data?.plan;
  const usagePercent = data?.usagePercent;
  const freeUsagePercent = data?.freeUsagePercent;
  const displayUsagePercent = plan ? usagePercent : freeUsagePercent;

  const badgeVariant: "default" | "outline" | "secondary" = "secondary";
  let badgeClassName = "text-xs px-2 py-0.5";

  if (plan === "Basic") {
    badgeClassName +=
      " bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30";
  } else if (plan === "Pro") {
    badgeClassName +=
      " bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30";
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-accent/30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage alt={user.name} src={user.image || undefined} />
              <AvatarFallback className="text-lg font-medium">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-lg">{user.name}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            className="font-medium"
            onClick={async () => {
              await signOut({});
            }}
            size="sm"
            variant="outline"
          >
            Sign out
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-accent/30 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium">Subscription & Usage</h4>
                <Badge className={badgeClassName} variant={badgeVariant}>
                  {plan ? `${plan} Plan` : "Free Plan"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage your plan and view credit usage
              </p>
            </div>
            {!plan && (
              <Button
                className="shrink-0 font-semibold gap-1.5"
                onClick={() => {
                  const location = router.buildLocation({
                    to: "/subscribe",
                  });
                  addTab({ urlPath: location.href });
                  window.close();
                }}
                size="sm"
                variant="brand"
              >
                <GemIcon className="size-3.5" />
                Upgrade Now
              </Button>
            )}
          </div>

          <div className="space-y-4 pt-2">
            {displayUsagePercent === undefined ? null : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {plan ? "Monthly Usage" : "Free Usage"}
                  </span>
                  <span className="text-muted-foreground">
                    {displayUsagePercent.toFixed(0)}% used
                  </span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                    style={{
                      width: `${displayUsagePercent}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {data?.nextAllocation && (
              <p className="text-xs text-muted-foreground">
                Next credit allocation on{" "}
                {new Date(data.nextAllocation).toLocaleDateString()}
              </p>
            )}
            {plan && (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  className="font-medium"
                  onClick={handleManageSubscription}
                  size="sm"
                  variant="outline"
                >
                  Manage Subscription
                </Button>
                <Button
                  className="shrink-0 font-semibold gap-1.5"
                  onClick={() => {
                    const location = router.buildLocation({
                      to: "/subscribe",
                    });
                    addTab({ urlPath: location.href });
                    window.close();
                  }}
                  size="sm"
                  variant="brand"
                >
                  <GemIcon className="size-3.5" />
                  {plan ? "Upgrade to Pro" : "Upgrade Now"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
