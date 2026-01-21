import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { Progress } from "@/client/components/ui/progress";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { tv } from "tailwind-variants";

import { useLiveSubscriptionStatus } from "../hooks/use-live-subscription-status";

const planBadgeVariants = tv({
  base: "px-2 py-0.5 text-xs",
  defaultVariants: {
    plan: "free",
  },
  variants: {
    plan: {
      basic:
        "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
      free: "",
      pro: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/30",
    },
  },
});

export function SubscriptionCard() {
  const { addTab } = useTabActions();
  const {
    data: subscription,
    error,
    isLoading,
    refetch,
  } = useLiveSubscriptionStatus({
    input: { staleTime: 0 },
  });
  const { mutateAsync: createPortalSession } = useMutation(
    rpcClient.stripe.createPortalSession.mutationOptions(),
  );
  const { mutateAsync: openExternalLink } = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const handleManageSubscription = async () => {
    try {
      const { url } = await createPortalSession({});
      if (url) {
        await openExternalLink({ url });
      } else {
        toast.error("Failed to create portal session");
      }
    } catch {
      toast.error("Failed to create portal session");
    }
  };

  if (error) {
    return (
      <Card className="bg-accent/30 p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <h4 className="mb-1 font-medium">Subscription & Usage</h4>
            <p className="text-sm text-destructive">
              Failed to load subscription status
            </p>
          </div>
          <Button onClick={() => void refetch()} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (isLoading || !subscription) {
    return (
      <Card className="bg-accent/30 p-4 shadow-sm">
        <div className="space-y-6">
          <div>
            <h4 className="mb-1 font-medium">Subscription & Usage</h4>
            <p className="text-sm text-muted-foreground">
              Loading subscription status...
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const hasPaidPlan = subscription.plan !== null;
  const displayUsagePercent = hasPaidPlan
    ? subscription.usagePercent
    : subscription.freeUsagePercent;

  const planVariant =
    subscription.plan === "Basic"
      ? "basic"
      : subscription.plan === "Pro"
        ? "pro"
        : "free";

  return (
    <Card className="bg-accent/30 p-4 shadow-sm">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h4 className="font-medium">Subscription & Usage</h4>
              <Badge
                className={cn(planBadgeVariants({ plan: planVariant }))}
                variant="secondary"
              >
                {subscription.plan ?? "Free"} Plan
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage your plan and view credit usage
            </p>
          </div>
          {!hasPaidPlan && (
            <Button
              className="shrink-0 gap-1.5 font-semibold"
              onClick={() => {
                void addTab({ to: "/subscribe" });
                window.close();
              }}
              size="sm"
              variant="brand"
            >
              Get more credits
            </Button>
          )}
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {hasPaidPlan ? "Monthly Usage" : "Free Usage"}
              </span>
              <span className="text-muted-foreground">
                {displayUsagePercent.toFixed(0)}% used
              </span>
            </div>
            <Progress value={displayUsagePercent} />
          </div>
          {subscription.nextAllocation && (
            <p className="text-xs text-muted-foreground">
              Next credit allocation on{" "}
              {new Date(subscription.nextAllocation).toLocaleDateString()}
            </p>
          )}
          {hasPaidPlan && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                className="font-medium"
                onClick={handleManageSubscription}
                size="sm"
                variant="outline"
              >
                Manage Subscription
              </Button>
              {subscription.plan === "Basic" && (
                <Button
                  className="shrink-0 gap-1.5 font-semibold"
                  onClick={() => {
                    void addTab({ to: "/subscribe" });
                    window.close();
                  }}
                  size="sm"
                  variant="brand"
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
