import { featuresAtom } from "@/client/atoms/features";
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
import { type MainAppPath } from "@/electron-main/lib/urls";
import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import {
  BotIcon,
  FlagIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  UserIcon,
} from "lucide-react";

import { isLinux } from "../lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

const isDev = import.meta.env.DEV;

function SettingsLayout() {
  const matchRoute = useMatchRoute();
  const features = useAtomValue(featuresAtom);

  const sidebarNavItems: {
    icon: React.ElementType;
    path: Extract<
      MainAppPath,
      | "/settings"
      | "/settings/account"
      | "/settings/advanced"
      | "/settings/features"
      | "/settings/providers"
    >;
    title: string;
  }[] = [
    { icon: SettingsIcon, path: "/settings", title: "General" },
    ...(features.questsAccounts
      ? [
          {
            icon: UserIcon,
            path: "/settings/account" as const,
            title: "Account",
          },
        ]
      : []),
    { icon: BotIcon, path: "/settings/providers", title: "Providers" },
    {
      icon: SlidersHorizontalIcon,
      path: "/settings/advanced",
      title: "Advanced",
    },
    ...(isDev
      ? [
          {
            icon: FlagIcon,
            path: "/settings/features" as const,
            title: "Features",
          },
        ]
      : []),
  ];

  return (
    <div className="bg-background h-full w-full flex flex-col overflow-hidden">
      {isLinux() ? (
        <div className="pt-4"></div>
      ) : (
        <div className="px-6 pt-2 pb-4 [-webkit-app-region:drag] text-center font-semibold">
          Settings
        </div>
      )}
      <div className="flex-1 px-3 overflow-y-auto">
        <SidebarProvider className="min-h-0" defaultOpen>
          <Sidebar className="bg-transparent" collapsible="none">
            <SidebarContent>
              <SidebarMenu>
                {sidebarNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={Boolean(matchRoute({ to: item.path }))}
                    >
                      <InternalLink allowOpenNewTab={false} to={item.path}>
                        <item.icon />
                        <span>{item.title}</span>
                      </InternalLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
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
