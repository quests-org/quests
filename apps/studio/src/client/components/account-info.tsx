import { Button } from "@/client/components/ui/button";
import { signOut } from "@/client/lib/sign-out";
import { rpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { ErrorAlert } from "./error-alert";
import { SubscriptionCard } from "./subscription-card";
import { UserInfoCard } from "./user-info-card";

export function AccountInfo() {
  const { data: hasToken } = useQuery(rpcClient.auth.hasToken.queryOptions());
  const { data: user, error } = useQuery(rpcClient.user.me.queryOptions());
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Account</h3>
      </div>
      {user?.id ? (
        <>
          <UserInfoCard />
          <SubscriptionCard />
        </>
      ) : (
        <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
          <div className="space-y-3">
            {error && (
              <ErrorAlert
                subject="Account Connection Error"
                title="Connection error"
              >
                {error.message}
              </ErrorAlert>
            )}
            {hasToken ? (
              <div className="flex justify-end gap-4">
                <Button
                  className="font-medium"
                  onClick={() => {
                    void signOut();
                  }}
                  size="sm"
                  variant="outline"
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    Try all the latest models for free
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Claim your free credits by signing up for an account.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const location = router.buildLocation({ to: "/sign-in" });
                    addTab({ urlPath: location.href });
                    window.close();
                  }}
                  variant="brand"
                >
                  Sign in
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
