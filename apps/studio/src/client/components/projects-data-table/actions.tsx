import type { ProjectSubdomain } from "@quests/workspace/client";

import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useAppState } from "@/client/hooks/use-app-state";
import { rpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Loader2,
  MoreVertical,
  Settings,
  Square,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

export function ProjectActionsCell({
  onDelete,
  onOpenInNewTab,
  onSettings,
  onStop,
  subdomain,
}: {
  onDelete: (subdomain: ProjectSubdomain) => void;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
  onSettings: (subdomain: ProjectSubdomain) => void;
  onStop: (subdomain: ProjectSubdomain) => void;
  subdomain: ProjectSubdomain;
}) {
  const { data: appState } = useAppState({ subdomain });
  const sessionActors = appState?.sessionActors ?? [];
  const isRunning = sessionActors.some((actor) =>
    actor.tags.includes("agent.alive"),
  );

  const { data: favoriteProjects } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );
  const isFavorite = favoriteProjects?.some(
    (favorite) => favorite.subdomain === subdomain,
  );

  const { mutateAsync: removeFavorite } = useMutation(
    rpcClient.favorites.remove.mutationOptions(),
  );

  const { mutateAsync: addFavorite } = useMutation(
    rpcClient.favorites.add.mutationOptions(),
  );

  return (
    <div className="flex items-center justify-end gap-x-1">
      {isRunning && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={(e) => {
                e.preventDefault();
                onStop(subdomain);
              }}
              size="icon"
              variant="ghost"
            >
              <div className="relative flex items-center justify-center">
                <Loader2 className="size-4 animate-spin" />
                <Square className="size-1.5 fill-current absolute inset-0 m-auto" />
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={(e) => {
              e.preventDefault();
              onDelete(subdomain);
            }}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <MoreVertical className="size-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              onOpenInNewTab(subdomain);
            }}
          >
            <ArrowUpRight className="text-muted-foreground" />
            <span>Open in new tab</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              onSettings(subdomain);
            }}
          >
            <Settings className="text-muted-foreground" />
            <span>Settings</span>
          </DropdownMenuItem>
          {isFavorite ? (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                void removeFavorite({ subdomain });
              }}
            >
              <StarOff className="text-muted-foreground" />
              <span>Remove favorite</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                void addFavorite({ subdomain });
              }}
            >
              <Star className="text-muted-foreground" />
              <span>Favorite</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
