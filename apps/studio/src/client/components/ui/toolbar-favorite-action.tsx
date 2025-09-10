import { Button } from "@/client/components/ui/button";
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
  const { data: favoriteProjects } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );
  const isFavorite = favoriteProjects?.some(
    (favorite) => favorite.subdomain === project.subdomain,
  );

  const { mutateAsync: removeFavorite } = useMutation(
    rpcClient.favorites.remove.mutationOptions(),
  );

  const { mutateAsync: addFavorite } = useMutation(
    rpcClient.favorites.add.mutationOptions(),
  );

  const handleUnfavorite = () => {
    void removeFavorite({ subdomain: project.subdomain });
  };

  const handleAddFavorite = async () => {
    await addFavorite({ subdomain: project.subdomain });
  };

  return (
    <Button
      className={cn(compact && "size-7")}
      onClick={() => {
        if (isFavorite) {
          handleUnfavorite();
        } else {
          void handleAddFavorite();
        }
      }}
      size="sm"
      variant="ghost"
    >
      {isFavorite ? (
        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
      ) : (
        <Star className="h-4 w-4" />
      )}
      <span className="sr-only">
        {isFavorite ? "Unfavorite Project" : "Favorite Project"}
      </span>
    </Button>
  );
}
