import { Toggle } from "@/client/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

interface ToolbarFavoriteActionProps {
  compact?: boolean;
  project: WorkspaceAppProject;
}

export function ToolbarFavoriteAction({
  compact = false,
  project,
}: ToolbarFavoriteActionProps) {
  const { data: favoriteProjects, isLoading } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );
  const isFavorite =
    favoriteProjects?.some(
      (favorite) => favorite.subdomain === project.subdomain,
    ) ?? false;

  const { mutateAsync: removeFavorite } = useMutation(
    rpcClient.favorites.remove.mutationOptions(),
  );

  const { mutateAsync: addFavorite } = useMutation(
    rpcClient.favorites.add.mutationOptions(),
  );

  const handleToggle = (pressed: boolean) => {
    if (pressed) {
      void addFavorite({ subdomain: project.subdomain });
    } else {
      void removeFavorite({ subdomain: project.subdomain });
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          aria-label={isFavorite ? "Unfavorite Project" : "Favorite Project"}
          className={cn(compact && "size-7")}
          disabled={isLoading}
          onPressedChange={handleToggle}
          pressed={isFavorite}
          size="sm"
        >
          <Star
            className={cn(
              "size-4",
              isFavorite && "fill-amber-500 text-amber-500",
            )}
          />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        {isFavorite ? "Remove from favorites" : "Add to favorites"}
      </TooltipContent>
    </Tooltip>
  );
}
