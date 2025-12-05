import { userAtom } from "@/client/atoms/user";
import { Button } from "@/client/components/ui/button";
import { useUserConnectionError } from "@/client/hooks/use-user-connection-error";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { ErrorAlert } from "./error-alert";
import { SubscriptionCard } from "./subscription-card";
import { UserInfoCard } from "./user-info-card";

export function AccountInfo() {
  const [userResult] = useAtom(userAtom);
  const user = userResult.data;
  const { error, hasError } = useUserConnectionError();
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
            {hasError && error && (
              <ErrorAlert
                subject="Account Connection Error"
                title="Connection error"
              >
                {error.message}
              </ErrorAlert>
            )}
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
          </div>
        </div>
      )}
    </div>
  );
}
