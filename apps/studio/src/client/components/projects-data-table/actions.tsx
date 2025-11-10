import type { ProjectSubdomain } from "@quests/workspace/client";

import { StopIcon } from "@/client/components/stop-icon";
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
  MoreVertical,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";

export function ProjectActionsCell({
  onDelete,
  onOpenInNewTab,
  onStop,
  subdomain,
}: {
  onDelete: (subdomain: ProjectSubdomain) => void;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
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
    <div className="flex items-center gap-x-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={!isRunning}
            onClick={(e) => {
              e.preventDefault();
              onStop(subdomain);
            }}
            size="icon"
            variant="ghost"
          >
            <StopIcon className="size-4 stroke-2" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isRunning ? "Stop" : "No running agents"}
        </TooltipContent>
      </Tooltip>
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
