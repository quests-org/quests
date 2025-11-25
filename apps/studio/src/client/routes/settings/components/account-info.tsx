import { userAtom } from "@/client/atoms/user";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { rpcClient } from "@/client/rpc/client";
import { QuestsLogoIcon } from "@quests/components/logo";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAtom } from "jotai";

import { SubscriptionCard } from "./subscription-card";
import { UserInfoCard } from "./user-info-card";

export function AccountInfo() {
  const [userResult] = useAtom(userAtom);
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();
  const user = userResult.data;

  if (!user?.id) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">Account</h3>
        </div>
        <Card className="p-4 bg-accent/30 shadow-sm">
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
                    to: "/login",
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
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <UserInfoCard />
      <SubscriptionCard />
    </div>
  );
}
