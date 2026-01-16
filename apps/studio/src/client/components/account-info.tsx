import { Button } from "@/client/components/ui/button";
import { Skeleton } from "@/client/components/ui/skeleton";
import { useLiveUser } from "@/client/hooks/use-live-user";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { signOut } from "@/client/lib/sign-out";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";

import { ContactErrorAlert } from "./contact-error-alert";
import { SubscriptionCard } from "./subscription-card";
import { UserInfoCard } from "./user-info-card";

export function AccountInfo() {
  const { data: hasToken } = useQuery(
    rpcClient.auth.live.hasToken.experimental_liveOptions(),
  );
  const { data: user, error, isLoading, refetch } = useLiveUser();

  const { addTab } = useTabActions();

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
            {hasToken ? (
              <>
                {isLoading && (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
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
                )}
                {!user && error && (
                  <>
                    <ContactErrorAlert
                      onRetry={() => {
                        void refetch();
                      }}
                      subject="Account Connection Error"
                      title="Connection error"
                    >
                      {error.message}
                    </ContactErrorAlert>
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
                  </>
                )}
                {!isLoading && !error && (
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
                )}
              </>
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
                    void addTab({ to: "/sign-in" });
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
