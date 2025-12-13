import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";

import { InternalLink } from "./internal-link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export function UpgradeSubscriptionAlert({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const { data: subscription } = useQuery(
    rpcClient.user.live.subscriptionStatus.experimental_liveOptions(),
  );

  const plan = subscription?.plan;
  const usagePercent = subscription?.usagePercent;
  const freeUsagePercent = subscription?.freeUsagePercent;
  const displayUsagePercent = plan ? usagePercent : freeUsagePercent;

  const hasCredits =
    displayUsagePercent !== undefined && displayUsagePercent < 100;

  return (
    <Alert>
      {hasCredits ? (
        <>
          <AlertTitle>Ready to continue</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              You now have credits available. Click continue or send a new
              message to resume the agent.
            </span>
            <div className="flex">
              <Button onClick={onContinue} size="sm">
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
