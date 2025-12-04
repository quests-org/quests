import { userAtom } from "@/client/atoms/user";
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
import { useUserConnectionError } from "@/client/hooks/use-user-connection-error";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { getInitials } from "@/client/lib/get-initials";
import { signOut } from "@/client/lib/sign-out";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
  AlertCircle,
  ChevronsUpDown,
  KeyIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";
import { startTransition } from "react";

export function NavUser() {
  const { isMobile } = useSidebar();
  const [userResult, refreshUser] = useAtom(userAtom);
  const router = useRouter();
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const { error, hasError } = useUserConnectionError();

  const user = userResult.data;
  const { data: providerConfigs } = useQuery(
    rpcClient.providerConfig.live.list.experimental_liveOptions(),
  );
  const { data: subscriptionData } = useQuery(
    rpcClient.user.live.subscription.experimental_liveOptions(),
  );

  const plan = subscriptionData?.data?.plan;
  const isFreePlan = subscriptionData?.data?.plan === null;
  const badgeVariant: "default" | "outline" | "secondary" = "secondary";
  let badgeClassName = "text-xs px-1 py-0.5 ";

  if (plan === "Basic") {
    badgeClassName +=
      " bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30";
  } else if (plan === "Pro") {
    badgeClassName +=
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30";
  }

  const onUpgrade = () => {
    captureClientEvent("upgrade.clicked", {
      source: "nav_user",
    });
    const location = router.buildLocation({
      to: "/subscribe",
    });
    addTab({ urlPath: location.href });
  };

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem className="group">
          <SidebarMenuButton
            className="group-hover:bg-black/10 dark:group-hover:bg-white/10"
            onClick={() => {
              void vanillaRpcClient.preferences.openSettingsWindow({
                tab: "General",
              });
            }}
            size="lg"
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
                refreshUser();
              });
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="group-hover:bg-black/10 dark:group-hover:bg-white/10 data-[state=open]:bg-black/10 dark:data-[state=open]:bg-white/10"
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
            className="w-58 rounded-lg"
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
            {hasError && error && (
              <div className="px-2 py-1.5">
                <Button
                  className="w-full text-xs h-7 font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20"
                  onClick={() => {
                    void vanillaRpcClient.preferences.openSettingsWindow({
                      tab: "General",
                    });
                  }}
                  size="sm"
                >
                  <AlertCircle className="size-3 shrink-0" />
                  <span className="truncate">{error.message}</span>
                </Button>
              </div>
            )}
            {isFreePlan && (
              <div className="px-2 py-1.5">
                <Button
                  className="w-full text-xs h-7 font-semibold"
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
