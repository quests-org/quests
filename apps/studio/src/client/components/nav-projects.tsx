import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/client/components/ui/sidebar";
import { rpcClient } from "@/client/rpc/client";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { InternalLink } from "./internal-link";
import { NavProjectItem } from "./nav-project-item";

export function NavProjects({
  isFavorites,
  projects,
  title,
}: {
  isFavorites: boolean;
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

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      {!isFavorites && (
        <SidebarGroupAction asChild>
          <InternalLink
            className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground whitespace-nowrap"
            openInCurrentTab
            to="/projects"
          >
            View all
          </InternalLink>
        </SidebarGroupAction>
      )}
      <SidebarMenu className="gap-0">
        {projects.map((project) => (
          <NavProjectItem
            isFavorites={isFavorites}
            key={project.subdomain}
            onOpenInNewTab={handleOpenInNewTab}
            onRemoveFavorite={isFavorites ? handleRemoveFavorite : undefined}
            project={project}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
