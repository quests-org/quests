import { userAtom } from "@/client/atoms/user";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { useUserConnectionError } from "@/client/hooks/use-user-connection-error";
import { rpcClient } from "@/client/rpc/client";
import { QuestsLogoIcon } from "@quests/components/logo";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAtom } from "jotai";
import { AlertCircle } from "lucide-react";

import { SubscriptionCard } from "./subscription-card";
import { UserInfoCard } from "./user-info-card";

export function AccountInfo() {
  const [userResult] = useAtom(userAtom);
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();
  const user = userResult.data;
  const { error, hasError } = useUserConnectionError();

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
        <Card className="p-4 bg-accent/30 shadow-sm">
          <div className="space-y-3">
            {hasError && error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0 translate-y-0.5" />
                <div>{error.message}</div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-sm font-medium">Sign in to your account</div>
              <p className="text-sm text-muted-foreground">
                Manage your account settings and subscription.
              </p>
              <div className="pt-2">
                <Button
                  className="h-10 [&_svg]:size-6"
                  onClick={() => {
                    const location = router.buildLocation({
                      to: "/sign-in",
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
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
