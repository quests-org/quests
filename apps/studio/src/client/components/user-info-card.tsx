import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
import { Button } from "@/client/components/ui/button";
import { Card } from "@/client/components/ui/card";
import { useLiveUser } from "@/client/hooks/use-live-user";
import { getInitials } from "@/client/lib/get-initials";
import { signOut } from "@/client/lib/sign-out";

export function UserInfoCard() {
  const { data: user } = useLiveUser();

  if (!user?.id) {
    return null;
  }

  return (
    <Card className="bg-accent/30 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage alt={user.name} src={user.image || undefined} />
            <AvatarFallback className="text-sm font-medium">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold">{user.name}</h4>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <Button
          className="shrink-0 font-medium"
          onClick={() => {
            void signOut();
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
