import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/client/components/ui/sidebar";
import { rpcClient } from "@/client/rpc/client";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { type MakeRouteMatchUnion, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";

import { InternalLink } from "./internal-link";
import { NavProjectItem } from "./nav-project-item";

export function NavProjects({
  favoriteSubdomains,
  isFavorites,
  matches,
  projects,
  title,
}: {
  favoriteSubdomains: Set<string>;
  isFavorites: boolean;
  matches: MakeRouteMatchUnion[];
  projects: WorkspaceAppProject[];
  title: string;
}) {
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();

  const handleOpenInNewTab = (subdomain: ProjectSubdomain) => {
    const location = router.buildLocation({
      params: { subdomain },
      to: "/projects/$subdomain",
    });
    addTab({ urlPath: location.href });
  };
  const { mutate: removeFavorite } = useMutation(
    rpcClient.favorites.remove.mutationOptions(),
  );
  const handleRemoveFavorite = (subdomain: ProjectSubdomain) => {
    removeFavorite({ subdomain });
  };

  const projectStates = useMemo(
    () =>
      projects.map((project) => ({
        isActive: matches.some(
          (match) =>
            match.routeId === "/_app/projects/$subdomain/" &&
            match.params.subdomain.startsWith(project.subdomain),
        ),
        isFavorited: favoriteSubdomains.has(project.subdomain),
        subdomain: project.subdomain,
      })),
    [projects, matches, favoriteSubdomains],
  );

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel asChild={!isFavorites}>
        {isFavorites ? (
          title
        ) : (
          <InternalLink openInCurrentTab to="/projects">
            {title}
          </InternalLink>
        )}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        {projects.map((project) => {
          const state = projectStates.find(
            (s) => s.subdomain === project.subdomain,
          );
          return (
            <NavProjectItem
              isActive={state?.isActive ?? false}
              isFavorited={state?.isFavorited ?? false}
              isFavorites={isFavorites}
              key={project.subdomain}
              onOpenInNewTab={handleOpenInNewTab}
              onRemoveFavorite={isFavorites ? handleRemoveFavorite : undefined}
              project={project}
            />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
