import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/client/components/ui/sidebar";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { getInitials } from "@/client/lib/get-initials";
import { isLowOnCredits } from "@/client/lib/is-low-on-credits";
import { signOut } from "@/client/lib/sign-out";
import { rpcClient } from "@/client/rpc/client";
import { ChevronsUpDown, LogOutIcon, SettingsIcon } from "lucide-react";
import { startTransition } from "react";

import { useLiveSubscriptionStatus } from "../hooks/use-live-subscription-status";
import { useLiveUser } from "../hooks/use-live-user";

export function NavUser() {
  const { addTab } = useTabActions();
  const { data: user, refetch: refetchUser } = useLiveUser();
  const { data: subscription, refetch: refetchSubscription } =
    useLiveSubscriptionStatus();

  const planName = subscription?.plan ?? null;
  const badgeVariant: "default" | "outline" | "secondary" = "secondary";
  let badgeClassName = "text-xs px-1 py-0.5 ";

  if (planName === "Basic") {
    badgeClassName +=
      " bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30";
  } else if (planName === "Pro") {
    badgeClassName +=
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30";
  }

  const onUpgrade = () => {
    captureClientEvent("upgrade.clicked", {
      source: "nav_user",
    });
    void addTab({ to: "/subscribe" });
  };

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem className="group">
          <SidebarMenuButton
            className="px-1 group-hover:bg-black/10 dark:group-hover:bg-white/10"
            onClick={() => {
              void rpcClient.preferences.openSettingsWindow.call({
                tab: "General",
              });
            }}
            size="default"
          >
            <SettingsIcon className="h-5 w-5" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Settings</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem className="group">
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) {
              startTransition(() => {
                void refetchUser();
                void refetchSubscription();
              });
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="px-1 group-hover:bg-black/10 data-[state=open]:bg-black/10 dark:group-hover:bg-white/10 dark:data-[state=open]:bg-white/10"
              size="lg"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage alt={user.name} src={user.image ?? undefined} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{user.name}</span>
                  {subscription && (
                    <Badge className={badgeClassName} variant={badgeVariant}>
                      {planName ?? "Free"}
                    </Badge>
                  )}
                </div>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-58 rounded-lg"
            side="top"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage alt={user.name} src={user.image ?? undefined} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{user.name}</span>
                    {subscription && (
                      <Badge className={badgeClassName} variant={badgeVariant}>
                        {planName ?? "Free"}
                      </Badge>
                    )}
                  </div>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            {subscription && isLowOnCredits(subscription) && (
              <div className="px-2 py-1.5">
                <Button
                  className="h-7 w-full text-xs font-semibold"
                  onClick={onUpgrade}
                  size="sm"
                  variant="brand"
                >
                  Get more credits
                </Button>
              </div>
            )}
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  void rpcClient.preferences.openSettingsWindow.call({
                    tab: "General",
                  });
                }}
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void signOut();
              }}
            >
              <LogOutIcon className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
