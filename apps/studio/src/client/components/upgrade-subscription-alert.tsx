import { InternalLink } from "@/client/components/internal-link";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Gem } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export function UpgradeSubscriptionAlert() {
  const { data: subscriptionData } = useQuery(
    rpcClient.user.live.subscription.experimental_liveOptions({
      refetchOnWindowFocus: true,
    }),
  );

  const data = subscriptionData?.data;
  const plan = data?.plan;
  const usagePercent = data?.usagePercent;
  const freeUsagePercent = data?.freeUsagePercent;
  const displayUsagePercent = plan ? usagePercent : freeUsagePercent;

  const hasCredits =
    displayUsagePercent !== undefined && displayUsagePercent < 100;

  return (
    <Alert
      className={cn(
        hasCredits &&
          "border-emerald-200 bg-linear-to-br from-emerald-50 to-background dark:border-emerald-800/50 dark:from-emerald-950/30 dark:to-background",
      )}
    >
      {hasCredits ? (
        <>
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-emerald-900 dark:text-emerald-100">
            You&apos;re all set with more credits!
          </AlertTitle>
          <AlertDescription className="text-emerald-800 dark:text-emerald-200">
            You can now continue.
          </AlertDescription>
        </>
      ) : (
        <>
          <AlertTitle>You&apos;ve hit your credit limit</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>You don&apos;t have enough credits to continue.</p>
            <div className="flex">
              <Button size="sm" variant="brand">
                <Gem className="size-3" />
                <InternalLink openInNewTab to="/subscribe">
                  Get more credits
                </InternalLink>
              </Button>
            </div>
          </AlertDescription>
        </>
      )}
    </Alert>
  );
}
