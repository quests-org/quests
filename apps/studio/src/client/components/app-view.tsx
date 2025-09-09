import { AppIFrame } from "@/client/components/app-iframe";
import { AppToolbar } from "@/client/components/app-toolbar";
import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Input } from "@/client/components/ui/input";
import { ToolbarFavoriteAction } from "@/client/components/ui/toolbar-favorite-action";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderPen, MoreVertical, PinOff, Settings } from "lucide-react";
import { useRef, useState } from "react";

import { AppLink } from "./app-link";

interface AppViewProps {
  app: WorkspaceAppProject;
}

export function AppView({ app }: AppViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { data: favoriteProjects } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );
  const isFavorite = favoriteProjects?.some(
    (favorite) => favorite.subdomain === app.subdomain,
  );
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const { mutateAsync: removeFavorite } = useMutation(
    rpcClient.favorites.remove.mutationOptions(),
  );

  const handleRemoveFavorite = () => {
    void removeFavorite({ subdomain: app.subdomain });
  };

  const centerContent = (
    <div className="flex flex-1 justify-center">
      <Input
        className="text-center flex-1 py-0 text-xs md:text-xs h-7"
        readOnly
        value={app.urls.localhost}
      />
    </div>
  );

  const rightActions = (
    <div className="flex shrink-0 items-center gap-1">
      <ToolbarFavoriteAction compact project={app} />
      <AppLink params={{ subdomain: app.subdomain }} to="/projects/$subdomain">
        <Button className="text-xs h-7" size="sm" variant="outline">
          <FolderPen className="h-3 w-3" />
          Return to Project
        </Button>
      </AppLink>
      <DropdownMenu modal>
        <DropdownMenuTrigger asChild>
          <Button className="size-7" size="icon" variant="ghost">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          {isFavorite && (
            <DropdownMenuItem onClick={handleRemoveFavorite}>
              <PinOff className="text-muted-foreground" />
              <span>Remove from Favorites</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              setSettingsDialogOpen(true);
            }}
          >
            <Settings className="text-muted-foreground" />
            <span>App Settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="flex flex-col h-dvh w-full">
      <AppToolbar
        app={app}
        centerContent={centerContent}
        compact
        iframeRef={iframeRef}
        rightActions={rightActions}
      />
      <div className="flex-1 h-full w-full">
        <AppIFrame app={app} iframeRef={iframeRef} />
      </div>
      <ProjectSettingsDialog
        dialogTitle="App Settings"
        onOpenChange={setSettingsDialogOpen}
        open={settingsDialogOpen}
        subdomain={app.subdomain}
      />
    </div>
  );
}
