import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Gem, Play } from "lucide-react";

import { InternalLink } from "./internal-link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export function UpgradeSubscriptionAlert({
  onContinue,
}: {
  onContinue: () => void;
}) {
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
          <AlertDescription className="flex flex-col gap-3 text-emerald-800 dark:text-emerald-200">
            <span>You can now continue.</span>
            <div className="flex">
              <Button onClick={onContinue} size="sm" variant="secondary">
                <Play className="size-3" />
                Continue
              </Button>
            </div>
          </AlertDescription>
        </>
      ) : (
        <>
          <AlertTitle>You&apos;ve hit your credit limit</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>You don&apos;t have enough credits to continue.</p>
            <div className="flex">
              <Button asChild size="sm" variant="brand">
                <InternalLink openInNewTab to="/subscribe">
                  <Gem className="size-3" />
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
