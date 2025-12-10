import { InternalLink } from "@/client/components/internal-link";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/client/components/ui/sidebar";
import { Toaster } from "@/client/components/ui/sonner";
import { type StudioPath } from "@/shared/studio-path";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  BotIcon,
  BugIcon,
  FlagIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { isLinux } from "../lib/utils";
import { rpcClient } from "../rpc/client";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  const sidebarNavItems: {
    icon: React.ElementType;
    path:
      | "/settings/debug"
      | Extract<
          StudioPath,
          | "/settings"
          | "/settings/advanced"
          | "/settings/features"
          | "/settings/providers"
        >;
    title: string;
  }[] = [
    { icon: SettingsIcon, path: "/settings", title: "General" },
    { icon: BotIcon, path: "/settings/providers", title: "Providers" },
    {
      icon: SlidersHorizontalIcon,
      path: "/settings/advanced",
      title: "Advanced",
    },
    ...(preferences?.developerMode
      ? [
          {
            icon: FlagIcon,
            path: "/settings/features" as const,
            title: "Features",
          },
          {
            icon: BugIcon,
            path: "/settings/debug" as const,
            title: "Debug",
          },
        ]
      : []),
  ];

  return (
    <div className="bg-background h-svh w-full flex flex-col overflow-hidden">
      {isLinux() ? (
        <div className="pt-4"></div>
      ) : (
        <div className="px-6 pt-2 pb-4 [-webkit-app-region:drag] text-center font-semibold shrink-0">
          Settings
        </div>
      )}
      <div className="flex-1 flex px-3 min-h-0">
        <SidebarProvider className="min-h-0 h-full" defaultOpen>
          <Sidebar
            className="bg-transparent h-full shrink-0"
            collapsible="none"
          >
            <SidebarContent>
              <SidebarMenu>
                {sidebarNavItems.map((item) => (
                  <SidebarMenuItem className="group" key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className="group-hover:bg-black/10 dark:group-hover:bg-white/10"
                    >
                      <InternalLink
                        activeOptions={{ exact: true }}
                        activeProps={{ "data-active": true }}
                        allowOpenNewTab={false}
                        to={item.path}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </InternalLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="overflow-y-auto">
            <div className="flex flex-1 flex-col gap-4 p-6">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
