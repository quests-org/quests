import { useLiveSubscriptionStatus } from "@/client/hooks/use-live-subscription-status";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";

import { InternalLink } from "./internal-link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export function UpgradeSubscriptionAlert({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const { data: subscription, error, isLoading } = useLiveSubscriptionStatus();
  const { data: hasToken } = useQuery(
    rpcClient.auth.live.hasToken.experimental_liveOptions(),
  );
  const { signIn } = useSignInSocial();

  if (error) {
    return (
      <Alert>
        <AlertTitle>Unable to load subscription status</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>
            {/* cspell:ignore couldn */}
            We couldn&apos;t load your subscription information. Please try
            again later.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || (hasToken && !subscription)) {
    return (
      <Alert>
        <AlertTitle>
          <Skeleton className="h-5 w-48" />
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex">
            <Skeleton className="h-8 w-32" />
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasToken || !subscription) {
    return (
      <Alert>
        <AlertTitle>Sign in required</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>Sign in to Quests to continue.</span>
          <div className="flex">
            <Button onClick={() => void signIn()} size="sm" variant="brand">
              Sign in
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      {subscription.hasEnoughCredits ? (
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
