import { AppFavoriteDialog } from "@/client/components/app-favorite-dialog";
import { AppLink } from "@/client/components/app-link";
import { ProjectDropdownMenu } from "@/client/components/project-dropdown-menu";
import { ToolbarFavoriteAction } from "@/client/components/ui/toolbar-favorite-action";
import { isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ExternalLinkIcon,
  FolderOpenIcon,
  Fullscreen,
  MoreVertical,
  PenLine,
  SettingsIcon,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppToolbar } from "./app-toolbar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ProjectToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  project: WorkspaceAppProject;
  subdomain: ProjectSubdomain;
}

export function ProjectToolbar({
  iframeRef,
  project,
  subdomain,
}: ProjectToolbarProps) {
  const { data: favoriteProjects } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );
  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );
  const [settingsDialogMode, setSettingsDialogMode] = useState<
    "favorites" | "settings" | undefined
  >(undefined);
  const isFavorite = favoriteProjects?.some(
    (favorite) => favorite.subdomain === subdomain,
  );

  const openAppInMutation = useMutation(
    rpcClient.utils.openAppIn.mutationOptions({
      onError: (error) => {
        toast.error("Failed to open in app", {
          description: error.message,
        });
      },
    }),
  );

  const handleOpenExternalClick = () => {
    openExternalLinkMutation.mutate({ url: project.urls.localhost });
  };

  const centerActions = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <AppLink params={{ subdomain }} to="/projects/$subdomain/view">
            <Button size="icon" variant="ghost">
              <Fullscreen className="h-4 w-4" />
            </Button>
          </AppLink>
        </TooltipTrigger>
        <TooltipContent>
          <p>Full screen</p>
        </TooltipContent>
      </Tooltip>
      <ToolbarFavoriteAction project={project} />
    </>
  );

  const rightActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2" variant="outline">
            <PenLine className="h-4 w-4" />
            Open in
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              void openAppInMutation.mutateAsync({
                subdomain,
                type: "terminal",
              });
            }}
          >
            <Terminal className="h-4 w-4 mr-2" />
            Open in Terminal
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void openAppInMutation.mutateAsync({
                subdomain,
                type: "cursor",
              });
            }}
          >
            <PenLine className="h-4 w-4 mr-2" />
            Open in Cursor
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void openAppInMutation.mutateAsync({
                subdomain,
                type: "vscode",
              });
            }}
          >
            <ExternalLinkIcon className="h-4 w-4 mr-2" />
            Open in VS Code
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void openAppInMutation.mutateAsync({
                subdomain,
                type: "show-in-folder",
              });
            }}
          >
            <FolderOpenIcon className="h-4 w-4 mr-2" />
            {isMacOS() ? "Reveal in Finder" : "Show in File Manager"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenExternalClick}>
            <ExternalLinkIcon className="h-4 w-4 mr-2" />
            Open in External Browser
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectDropdownMenu
        moreActions={
          <DropdownMenuItem
            onClick={() => {
              setSettingsDialogMode("settings");
            }}
          >
            <SettingsIcon />
            <span>App Settings</span>
          </DropdownMenuItem>
        }
        project={project}
      >
        <Button size="icon" variant="ghost">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">More options</span>
        </Button>
      </ProjectDropdownMenu>

      <AppFavoriteDialog
        dialogTitle={
          settingsDialogMode === "favorites"
            ? "Add Favorite"
            : "Project Settings"
        }
        isFavorite={!!isFavorite}
        mode={settingsDialogMode ?? "settings"}
        onOpenChange={(open) => {
          setSettingsDialogMode(open ? "favorites" : undefined);
        }}
        open={!!settingsDialogMode}
        subdomain={subdomain}
      />
    </>
  );

  return (
    <AppToolbar
      app={project}
      centerActions={centerActions}
      iframeRef={iframeRef}
      rightActions={rightActions}
    />
  );
}
