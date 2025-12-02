import { userAtom } from "@/client/atoms/user";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { getInitials } from "@/client/lib/get-initials";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";

export function UserInfoCard() {
  const [userResult] = useAtom(userAtom);
  const { mutateAsync: signOut } = useMutation(
    rpcClient.auth.signOut.mutationOptions({}),
  );
  const user = userResult.data;

  if (!user?.id) {
    return null;
  }

  return (
    <Card className="p-4 bg-accent/30 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage alt={user.name} src={user.image || undefined} />
            <AvatarFallback className="text-lg font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg">{user.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          className="font-medium"
          onClick={async () => {
            await signOut({});
          }}
          size="sm"
          variant="outline"
        >
          Sign out
        </Button>
      </div>
    </Card>
  );
}
