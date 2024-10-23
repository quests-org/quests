import { AppFavoriteDialog } from "@/client/components/app-favorite-dialog";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";

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
  const [settingsDialogMode, setSettingsDialogMode] = useState<
    "favorites" | "settings" | undefined
  >(undefined);

  const { mutateAsync: removeFavorite } = useMutation(
    rpcClient.favorites.remove.mutationOptions(),
  );

  const handleUnfavorite = () => {
    void removeFavorite({ subdomain: project.subdomain });
  };

  return (
    <>
      <Button
        className={cn(compact && "size-7")}
        onClick={() => {
          if (isFavorite) {
            handleUnfavorite();
          } else {
            setSettingsDialogMode("favorites");
          }
        }}
        size="icon"
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
      <AppFavoriteDialog
        dialogTitle={
          settingsDialogMode === "favorites" ? "Add Favorite" : "App Settings"
        }
        isFavorite={!!isFavorite}
        mode={settingsDialogMode ?? "settings"}
        onOpenChange={(open) => {
          setSettingsDialogMode(open ? "favorites" : undefined);
        }}
        open={settingsDialogMode !== undefined}
        subdomain={project.subdomain}
      />
    </>
  );
}
