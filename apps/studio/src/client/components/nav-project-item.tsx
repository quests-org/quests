import { SmallAppIcon } from "@/client/components/app-icon";
import { InternalLink } from "@/client/components/internal-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Input } from "@/client/components/ui/input";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/client/components/ui/sidebar";
import { useTabs } from "@/client/hooks/use-tabs";
import { useMatchesForPathname } from "@/client/lib/get-route-matches";
import { rpcClient } from "@/client/rpc/client";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Edit2,
  ExternalLinkIcon,
  MoreHorizontal,
  Star,
  StarOff,
  TrashIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppStatusIcon } from "./app-status-icon";

interface NavProjectItemProps {
  isFavorites: boolean;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(project.title);

  const { data: tabsData } = useTabs();

  const selectedTab = tabsData.selectedTabId
    ? tabsData.tabs.find((tab) => tab.id === tabsData.selectedTabId)
    : undefined;

  const matches = useMatchesForPathname(selectedTab?.pathname ?? "");

  const isActive = matches.some(
    (match) =>
      match.routeId === "/_app/projects/$subdomain/" &&
      // match subdomain mistakenly includes search params, so startsWith is used
      match.params.subdomain.startsWith(project.subdomain),
  );

  const { isPending: isRenameLoading, mutateAsync: renameProject } =
    useMutation(rpcClient.workspace.project.updateName.mutationOptions());

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const { data: favoriteProjects } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );
  const isFavorited = favoriteProjects?.some(
    (favorite) => favorite.subdomain === project.subdomain,
  );

  const { mutateAsync: addFavorite } = useMutation(
    rpcClient.favorites.add.mutationOptions(),
  );

  useEffect(() => {
    if (!isEditing) {
      setEditValue(project.title);
    }
  }, [project.title, isEditing]);

  const handleStartEdit = () => {
    setEditValue(project.title);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(project.title);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) {
      return;
    }

    if (editValue.trim() === project.title) {
      setIsEditing(false);
      return;
    }

    try {
      await renameProject({
        newName: editValue.trim(),
        subdomain: project.subdomain,
      });
      // wait for the project to be renamed
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      setIsEditing(false);
    } catch {
      setEditValue(project.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleOpenExternalClick = () => {
    openExternalLinkMutation.mutate({ url: project.urls.localRedirect });
  };

  const handleAddFavorite = async () => {
    await addFavorite({ subdomain: project.subdomain });
  };

  return (
    <SidebarMenuItem className="group" key={project.subdomain}>
      {isEditing ? (
        <div className="flex items-center gap-2 h-9 px-2">
          <SmallAppIcon
            background={project.icon?.background}
            icon={project.icon?.lucide}
            mode={project.mode}
            size="sm"
          />
          <Input
            autoFocus
            className="h-7 text-sm -ml-1 pl-1"
            disabled={isRenameLoading}
            onBlur={() => {
              void handleSaveEdit();
            }}
            onChange={(e) => {
              setEditValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            value={editValue}
          />
        </div>
      ) : (
        <SidebarMenuButton
          asChild
          className="h-9 group-hover:bg-black/10 dark:group-hover:bg-white/10 data-[active=true]:bg-black/15 dark:data-[active=true]:bg-white/15 data-[active=true]:text-foreground data-[active=true]:font-normal"
          isActive={isActive || undefined}
        >
          <InternalLink
            openInCurrentTab
            params={{ subdomain: project.subdomain }}
            title={project.title}
            to="/projects/$subdomain"
          >
            <SmallAppIcon
              background={project.icon?.background}
              icon={project.icon?.lucide}
              mode={project.mode}
              size="sm"
            />
            <span onDoubleClick={handleStartEdit}>{project.title}</span>
          </InternalLink>
        </SidebarMenuButton>
      )}

      {!isMenuOpen && !isEditing && (
        <div className="absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md group-hover:hidden pointer-events-none">
          <AppStatusIcon
            className="size-4 shrink-0 mt-1"
            subdomain={project.subdomain}
          />
        </div>
      )}

      {!isEditing && (
        <DropdownMenu onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal className="mt-1" />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-lg"
            side="bottom"
          >
            <DropdownMenuItem
              onClick={() => {
                onOpenInNewTab(project.subdomain);
              }}
            >
              <ArrowUpRight className="text-muted-foreground" />
              <span>Open in new tab</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenExternalClick}>
              <ExternalLinkIcon className="text-muted-foreground" />
              <span>Open in external browser</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleStartEdit}>
              <Edit2 className="text-muted-foreground" />
              <span>Rename</span>
            </DropdownMenuItem>
            {isFavorites && onRemoveFavorite && (
              <DropdownMenuItem
                onClick={() => {
                  onRemoveFavorite(project.subdomain);
                }}
              >
                <StarOff className="text-muted-foreground" />
                <span>Remove favorite</span>
              </DropdownMenuItem>
            )}
            {!isFavorites && !isFavorited && (
              <DropdownMenuItem
                onClick={() => {
                  void handleAddFavorite();
                }}
              >
                <Star className="text-muted-foreground" />
                <span>Favorite</span>
              </DropdownMenuItem>
            )}
            <InternalLink
              openInCurrentTab
              params={{ subdomain: project.subdomain }}
              search={{ showDelete: true }}
              to="/projects/$subdomain"
            >
              <DropdownMenuItem variant="destructive">
                <TrashIcon className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </InternalLink>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}
