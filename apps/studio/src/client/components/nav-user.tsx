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
  useSidebar,
} from "@/client/components/ui/sidebar";
import { getInitials } from "@/client/lib/get-initials";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type User } from "@/electron-main/api/types";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronsUpDown,
  GemIcon,
  KeyIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";

export function NavUser({
  isFreePlan,
  onUpgrade,
  user,
}: {
  isFreePlan?: boolean;
  onUpgrade?: () => void;
  user: User;
}) {
  const { isMobile } = useSidebar();

  const { data: providerConfigs } = useQuery(
    rpcClient.providerConfig.live.list.experimental_liveOptions(),
  );
  const { data: subscriptionData } = useQuery(
    rpcClient.user.live.subscription.experimental_liveOptions(),
  );

  const plan = subscriptionData?.data?.plan;
  const badgeVariant: "default" | "outline" | "secondary" = "secondary";
  let badgeClassName = "text-xs px-1 py-0.5";

  if (plan === "Basic") {
    badgeClassName +=
      "bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500";
  } else if (plan === "Pro") {
    badgeClassName += "bg-gradient-to-r from-blue-600 to-black text-white";
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                  <Badge className={badgeClassName} variant={badgeVariant}>
                    {plan ?? "Free"}
                  </Badge>
                </div>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
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
                    <Badge className={badgeClassName} variant={badgeVariant}>
                      {plan ?? "Free"}
                    </Badge>
                  </div>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            {isFreePlan && onUpgrade && (
              <div className="px-2 py-1.5">
                <Button
                  className="w-full text-xs h-7 font-semibold"
                  onClick={onUpgrade}
                  size="sm"
                  variant="brand"
                >
                  <GemIcon className="size-3" />
                  Upgrade for more credits
                </Button>
              </div>
            )}
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  void vanillaRpcClient.preferences.openSettingsWindow({
                    tab: "General",
                  });
                }}
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>

              {providerConfigs?.length === 0 && (
                <DropdownMenuItem
                  onClick={() => {
                    void vanillaRpcClient.preferences.openSettingsWindow({
                      showNewProviderDialog: true,
                      tab: "Providers",
                    });
                  }}
                >
                  <KeyIcon className="h-4 w-4" />
                  <span>Configure a provider</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void vanillaRpcClient.auth.signOut();
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
