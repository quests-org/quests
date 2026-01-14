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
              <h4 className="text-lg font-semibold">{user.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
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
    </Card>
  );
}
