import { userAtom } from "@/client/atoms/user";
import { Button } from "@/client/components/ui/button";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { useUserConnectionError } from "@/client/hooks/use-user-connection-error";
import { useAtom } from "jotai";
import { AlertCircle } from "lucide-react";

import { SubscriptionCard } from "./subscription-card";
import { UserInfoCard } from "./user-info-card";

export function AccountInfo() {
  const [userResult] = useAtom(userAtom);
  const user = userResult.data;
  const { error, hasError } = useUserConnectionError();
  const { signIn } = useSignInSocial();

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
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0 translate-y-0.5" />
                <div>{error.message}</div>
              </div>
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
              <Button onClick={() => void signIn()} variant="brand">
                Sign in
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
