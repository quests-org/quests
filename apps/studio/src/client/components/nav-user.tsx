import { featuresAtom } from "@/client/atoms/features";
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
import { getInitials } from "@/client/lib/get-initials";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useAtom, useAtomValue } from "jotai";
import {
  ChevronsUpDown,
  GemIcon,
  KeyIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";

export function NavUser() {
  const { isMobile } = useSidebar();
  const [userResult] = useAtom(userAtom);
  const features = useAtomValue(featuresAtom);
  const router = useRouter();
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());

  const user = userResult.data;
  const isAccountsEnabled = features.questsAccounts;

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
    const location = router.buildLocation({
      to: "/subscribe",
    });
    addTab({ urlPath: location.href });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              {isAccountsEnabled && user ? (
                <>
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      alt={user.name}
                      src={user.image ?? undefined}
                    />
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
                </>
              ) : (
                <>
                  <SettingsIcon className="h-5 w-5" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      Settings & Account
                    </span>
                  </div>
                </>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "top"}
            sideOffset={4}
          >
            {isAccountsEnabled && user ? (
              <>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        alt={user.name}
                        src={user.image ?? undefined}
                      />
                      <AvatarFallback className="rounded-lg">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {user.name}
                        </span>
                        <Badge
                          className={badgeClassName}
                          variant={badgeVariant}
                        >
                          {plan ?? "Free"}
                        </Badge>
                      </div>
                      <span className="truncate text-xs">{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                {isFreePlan && (
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
              </>
            ) : (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      const location = router.buildLocation({
                        to: "/login",
                      });
                      addTab({ urlPath: location.href });
                    }}
                  >
                    <LogOutIcon className="h-4 w-4" />
                    <span>Sign in</span>
                  </DropdownMenuItem>
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
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
