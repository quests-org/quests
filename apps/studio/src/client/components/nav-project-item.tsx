import { AppIcon } from "@/client/components/app-icon";
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
import { rpcClient } from "@/client/rpc/client";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Copy,
  Edit2,
  MoreHorizontal,
  Star,
  StarOff,
  TrashIcon,
} from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { AppStatusIcon } from "./app-status-icon";

interface NavProjectItemProps {
  isActive: boolean;
  isFavorited: boolean;
  isFavorites: boolean;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
  onRemoveFavorite?: (subdomain: ProjectSubdomain) => void;
  project: WorkspaceAppProject;
}

export const NavProjectItem = memo(function NavProjectItem({
  isActive,
  isFavorited,
  isFavorites,
  onOpenInNewTab,
  onRemoveFavorite,
  project,
}: NavProjectItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(project.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isPending: isRenameLoading, mutateAsync: renameProject } =
    useMutation(rpcClient.workspace.project.update.mutationOptions());

  const { mutateAsync: addFavorite } = useMutation(
    rpcClient.favorites.add.mutationOptions(),
  );

  if (!isEditing && editValue !== project.title) {
    setEditValue(project.title);
  }

  const handleStartEdit = () => {
    setEditValue(project.title);
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
        name: editValue.trim(),
        subdomain: project.subdomain,
      });
      // wait for client update to avoid flicker
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
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

  const handleAddFavorite = async () => {
    await addFavorite({ subdomain: project.subdomain });
  };

  return (
    <SidebarMenuItem className="group" key={project.subdomain}>
      {isEditing ? (
        <div className="flex h-9 items-center gap-2 px-2">
          <Input
            className="-ml-1 h-7 pl-1 text-sm"
            disabled={isRenameLoading}
            onBlur={() => {
              void handleSaveEdit();
            }}
            onChange={(e) => {
              setEditValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            value={editValue}
          />
        </div>
      ) : (
        <SidebarMenuButton
          asChild
          className="h-9 gap-1 group-hover:bg-black/10 data-[active=true]:bg-black/15 data-[active=true]:font-normal data-[active=true]:text-foreground dark:group-hover:bg-white/10 dark:data-[active=true]:bg-white/15"
          isActive={isActive}
        >
          <InternalLink
            onDoubleClick={handleStartEdit}
            openInCurrentTab
            params={{ subdomain: project.subdomain }}
            to="/projects/$subdomain"
          >
            <AppIcon name={project.iconName} size="xs" />
            <span>{project.title}</span>
          </InternalLink>
        </SidebarMenuButton>
      )}

      {!isMenuOpen && !isEditing && (
        <div className="pointer-events-none absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md group-hover:hidden">
          <AppStatusIcon
            className="mt-1 size-4 shrink-0"
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
            <DropdownMenuSeparator />
            <InternalLink
              openInCurrentTab
              params={{ subdomain: project.subdomain }}
              search={{ showDuplicate: true }}
              to="/projects/$subdomain"
            >
              <DropdownMenuItem>
                <Copy className="text-muted-foreground" />
                <span>Duplicate</span>
              </DropdownMenuItem>
            </InternalLink>
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
});
