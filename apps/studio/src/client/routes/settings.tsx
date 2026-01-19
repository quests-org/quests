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
    isWarning?: boolean;
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
            isWarning: true,
            path: "/settings/features" as const,
            title: "Features",
          },
          {
            icon: BugIcon,
            isWarning: true,
            path: "/settings/debug" as const,
            title: "Debug",
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
      {isLinux() ? (
        <div className="pt-4"></div>
      ) : (
        <div className="shrink-0 px-6 pt-2 pb-4 text-center font-semibold [-webkit-app-region:drag]">
          Settings
        </div>
      )}
      <div className="flex min-h-0 flex-1 px-3">
        <SidebarProvider className="h-full min-h-0" defaultOpen>
          <Sidebar
            className="h-full shrink-0 bg-transparent"
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
                        className={
                          item.isWarning
                            ? "text-warning-foreground [&>svg]:text-warning-foreground"
                            : undefined
                        }
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
