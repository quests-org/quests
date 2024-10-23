import { SmallAppIcon } from "@/client/components/app-icon";
import { SidebarLink } from "@/client/components/sidebar-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/client/components/ui/sidebar";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { ArrowUpRight, Fullscreen, MoreHorizontal, PinOff } from "lucide-react";
import { useState } from "react";

import { AppStatusIcon } from "./app-status-icon";

interface NavProjectItemProps {
  isFavorites: boolean;
  onOpenInNewTab: (subdomain: string) => void;
  onRemoveFavorite?: (subdomain: ProjectSubdomain) => void;
  project: WorkspaceAppProject;
}

export function NavProjectItem({
  isFavorites,
  onOpenInNewTab,
  onRemoveFavorite,
  project,
}: NavProjectItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <SidebarMenuItem className="group" key={project.subdomain}>
      <SidebarMenuButton
        asChild
        className="h-9 group-hover:bg-black/10 dark:group-hover:bg-white/10"
      >
        <SidebarLink
          params={{ subdomain: project.subdomain }}
          title={project.title}
          to="/projects/$subdomain"
        >
          {isFavorites && project.icon && (
            <SmallAppIcon
              background={project.icon.background}
              icon={project.icon.lucide}
              size="sm"
            />
          )}
          <span>{project.title}</span>
        </SidebarLink>
      </SidebarMenuButton>

      {!isMenuOpen && (
        <div className="absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md group-hover:hidden pointer-events-none">
          <AppStatusIcon
            className="h-4 w-4 shrink-0"
            subdomain={project.subdomain}
          />
        </div>
      )}

      <SidebarLink
        params={{ subdomain: project.subdomain }}
        title={`Launch ${project.title}`}
        to="/projects/$subdomain/view"
      >
        <SidebarMenuAction className="right-7" showOnHover>
          <Fullscreen className="mt-1" />
          <span className="sr-only">Launch App</span>
        </SidebarMenuAction>
      </SidebarLink>

      <DropdownMenu onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal className="mt-1" />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 rounded-lg"
          side="bottom"
        >
          <DropdownMenuItem
            onClick={() => {
              onOpenInNewTab(project.subdomain);
            }}
          >
            <ArrowUpRight className="text-muted-foreground" />
            <span>Open in New Tab</span>
          </DropdownMenuItem>
          <SidebarLink
            params={{ subdomain: project.subdomain }}
            to="/projects/$subdomain/view"
          >
            <DropdownMenuItem>
              <Fullscreen className="text-muted-foreground" />
              <span>Launch App</span>
            </DropdownMenuItem>
          </SidebarLink>
          {isFavorites && onRemoveFavorite && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  onRemoveFavorite(project.subdomain);
                }}
              >
                <PinOff className="text-muted-foreground" />
                <span>Remove from Favorites</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
