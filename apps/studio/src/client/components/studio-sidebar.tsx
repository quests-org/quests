import { featuresAtom } from "@/client/atoms/features";
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
import { useSelectedTab } from "@/client/hooks/tabs";
import { useMatchesForPathname } from "@/client/lib/get-route-matches";
import { logger } from "@/client/lib/logger";
import { cn, isMacOS, isWindows } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import {
  FlaskConical,
  Globe,
  PlusIcon,
  SettingsIcon,
  SidebarIcon,
  Telescope,
} from "lucide-react";
import * as React from "react";

export function StudioSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [userResult] = useAtom(userAtom);
  const features = useAtomValue(featuresAtom);

  const { data: sidebarVisibility } = useQuery(
    rpcClient.sidebar.live.visibility.experimental_liveOptions({}),
  );

  const isSidebarVisible = sidebarVisibility?.visible ?? true;

  const selectedTab = useSelectedTab();

  const matches = useMatchesForPathname(selectedTab?.pathname ?? "");

  const primaryNavItems = React.useMemo(
    () => [
      {
        icon: PlusIcon,
        isActive: matches.some((match) => match.routeId === "/_app/new-tab"),
        title: "New",
        url: "/new-tab" as const,
      },
      {
        icon: Telescope,
        isActive: matches.some((match) => match.routeId === "/_app/discover/"),
        title: "Discover",
        url: "/discover" as const,
      },
      {
        icon: FlaskConical,
        isActive: matches.some((match) =>
          match.routeId.startsWith("/_app/evals"),
        ),
        title: "Evals",
        url: "/evals" as const,
      },
      ...(features.browser
        ? [
            {
              icon: Globe,
              isActive: matches.some((match) => match.routeId === "/browser"),
              title: "Browser",
              url: "/browser" as const,
            },
          ]
        : []),
    ],
    [features.browser, matches],
  );

  const { data: favorites } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );

  const { data: projectsData } = useQuery(
    rpcClient.workspace.project.live.list.experimental_liveOptions(),
  );

  const { mutateAsync: closeSidebar } = useMutation(
    rpcClient.sidebar.close.mutationOptions(),
  );

  const favoriteSubdomains = React.useMemo(
    () => new Set(favorites?.map((r) => r.subdomain) ?? []),
    [favorites],
  );

  const filteredProjects = React.useMemo(() => {
    if (!projectsData?.projects || !favorites?.length) {
      return projectsData?.projects ?? [];
    }

    return projectsData.projects.filter(
      (project) => !favoriteSubdomains.has(project.subdomain),
    );
  }, [projectsData?.projects, favorites, favoriteSubdomains]);

  const user = userResult.data;
  const isAccountsEnabled = features.questsAccounts;

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
            !isWindows() && isSidebarVisible && "[-webkit-app-region:drag]",
            isMacOS() ? "pl-20" : "pl-4 justify-end",
          )}
        >
          <div className="flex items-center [-webkit-app-region:no-drag]">
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
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavPrimary items={primaryNavItems} />
        {favorites && favorites.length > 0 && (
          <NavProjects
            favoriteSubdomains={favoriteSubdomains}
            isFavorites
            matches={matches}
            projects={favorites}
            title="Favorites"
          />
        )}
        {filteredProjects.length > 0 && (
          <NavProjects
            favoriteSubdomains={favoriteSubdomains}
            isFavorites={false}
            matches={matches}
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
