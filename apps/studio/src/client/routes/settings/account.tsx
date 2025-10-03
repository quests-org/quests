import { userAtom } from "@/client/atoms/user";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { rpcClient } from "@/client/rpc/client";
import { QuestsLogoIcon } from "@quests/components/logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useAtom } from "jotai";

export const Route = createFileRoute("/settings/account")({
  component: SettingsAccountPage,
});

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function SettingsAccountPage() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">Account</h3>
      </div>
      <div className="rounded-lg border bg-accent/30 p-4 shadow-sm">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium">Quests Account</h4>
            <p className="text-sm text-muted-foreground">
              Your Quests account gives you access to AI models and credits.
            </p>
          </div>
          <UserInfoList />
        </div>
      </div>
    </div>
  );
}

function UserInfoList() {
  const [userResult] = useAtom(userAtom);
  const { data: creditsData } = useQuery(rpcClient.user.credits.queryOptions());
  const { mutateAsync: signOut } = useMutation(
    rpcClient.auth.signOut.mutationOptions(),
  );
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();
  const user = userResult.data;

  if (!user?.id) {
    return (
      <div className="py-4 text-center">
        <Button
          className="h-10 [&_svg]:size-6 px-24"
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
    );
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-4 p-3 pr-6 rounded-lg border bg-accent/50">
        <Avatar className="h-12 w-12">
          <AvatarImage alt={user.name} src={user.image || undefined} />
          <AvatarFallback className="text-sm font-medium">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{user.name}</h4>
            <Badge className="text-xs px-2 py-0.5" variant="secondary">
              Early Access
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ${((creditsData?.credits ?? 0) / 100).toFixed(2)} free credits
            remaining
          </p>
        </div>
      </div>
      <div>
        <Button
          onClick={async () => {
            await signOut({});
          }}
          variant="outline"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
