import { userAtom } from "@/client/atoms/user";
import { NavControls } from "@/client/components/nav-controls";
import { NavPrimary } from "@/client/components/nav-primary";
import { NavProjects } from "@/client/components/nav-projects";
import { NavSecondary } from "@/client/components/nav-secondary";
import { NavUser } from "@/client/components/nav-user";
import { Button } from "@/client/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/client/components/ui/sidebar";
import { logger } from "@/client/lib/logger";
import { cn, isMacOS } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { isFeatureEnabled } from "@/shared/features";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { LayoutGrid, PlusIcon, SettingsIcon, SidebarIcon } from "lucide-react";
import * as React from "react";

const data = {
  navMain: [
    {
      icon: PlusIcon,
      title: "New",
      url: "/new-tab" as const,
    },
    {
      icon: LayoutGrid,
      title: "Discover",
      url: "/discover" as const,
    },
  ],
};

export function StudioSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [userResult] = useAtom(userAtom);

  const { data: favorites } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );

  const { data: projectsData } = useQuery(
    rpcClient.workspace.project.live.list.experimental_liveOptions(),
  );

  const { mutateAsync: closeSidebar } = useMutation(
    rpcClient.sidebar.close.mutationOptions(),
  );

  // Filter out projects that are in favorites
  const filteredProjects = React.useMemo(() => {
    if (!projectsData?.projects || !favorites?.length) {
      return projectsData?.projects ?? [];
    }

    const favoriteSubdomains = new Set(favorites.map((r) => r.subdomain));

    return projectsData.projects.filter(
      (project) => !favoriteSubdomains.has(project.subdomain),
    );
  }, [projectsData?.projects, favorites]);

  const user = userResult.data;
  const isAccountsEnabled = isFeatureEnabled("questsAccounts");

  const settingsItems = [
    {
      icon: SettingsIcon,
      onClick: () => {
        void vanillaRpcClient.preferences.openSettingsWindow({
          tab: "General",
        });
      },
      title: "Settings",
    },
  ];

  return (
    <Sidebar collapsible="none" side="left" {...props}>
      <SidebarHeader>
        <div
          className={cn(
            "flex items-center py-1 mt-px",
            isMacOS() ? "ml-20" : "ml-4 justify-end",
          )}
        >
          <Button
            className="size-6 text-muted-foreground pr-1"
            onClick={() => {
              void closeSidebar({}).catch((error: unknown) => {
                logger.error("Error closing sidebar", { error });
              });
            }}
            size="icon"
            variant="ghost"
          >
            <SidebarIcon />
          </Button>
          <NavControls />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavPrimary items={data.navMain} />
        {favorites && favorites.length > 0 && (
          <NavProjects
            isFavorites={true}
            projects={favorites}
            title="Favorites"
          />
        )}
        {filteredProjects.length > 0 && (
          <NavProjects
            isFavorites={false}
            projects={filteredProjects}
            title="Projects"
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        {isAccountsEnabled && user ? (
          <NavUser user={user} />
        ) : (
          <NavSecondary asGroup={false} items={settingsItems} />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
