import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/client/components/ui/avatar";
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
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type User } from "@/electron-main/api/types";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronsUpDown,
  KeyIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";

import { AIProviderIcon } from "./ai-provider-icon";

const formatCredits = (credits: number) => {
  return credits.toFixed(2);
};

export function NavUser({ user }: { user: User }) {
  const { isMobile } = useSidebar();

  const { data: providers } = useQuery(
    rpcClient.provider.live.list.experimental_liveOptions(),
  );
  const openRouterProvider = providers?.find((p) => p.type === "openrouter");

  const { data: openRouterCredits } = useQuery({
    ...rpcClient.provider.credits.queryOptions({
      input: { provider: "openrouter" },
    }),
    enabled: Boolean(openRouterProvider),
    refetchInterval: 30_000, // Refetch every 30 seconds
  });

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
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
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
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {openRouterProvider && (
              <>
                <DropdownMenuItem>
                  <AIProviderIcon
                    className="size-4 shrink-0"
                    type="openrouter"
                  />
                  <span>
                    OpenRouter Credits: $
                    {openRouterCredits
                      ? formatCredits(
                          openRouterCredits.credits.total_credits -
                            openRouterCredits.credits.total_usage,
                        )
                      : ""}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

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

              {providers?.length === 0 && (
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
