import { SmallAppIcon } from "@/client/components/app-icon";
import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import { Button } from "@/client/components/ui/button";
import { ToolbarFavoriteAction } from "@/client/components/ui/toolbar-favorite-action";
import { isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import ColorHash from "color-hash";
import {
  Camera,
  ChevronDown,
  ExternalLinkIcon,
  FolderOpenIcon,
  PenLine,
  SettingsIcon,
  Share,
  Terminal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TrashIcon } from "./icons";
import { RestoreVersionModal } from "./restore-version-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface ProjectHeaderToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onDeleteClick: () => void;
  project: WorkspaceAppProject;
  selectedVersion?: string;
}

export function ProjectHeaderToolbar({
  iframeRef,
  onDeleteClick,
  project,
  selectedVersion,
}: ProjectHeaderToolbarProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const navigate = useNavigate();

  const hashColor = useMemo(() => {
    if (!selectedVersion) {
      return;
    }
    const colorHash = new ColorHash();
    return colorHash.hex(selectedVersion);
  }, [selectedVersion]);

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const showFileInFolderMutation = useMutation(
    rpcClient.utils.showFileInFolder.mutationOptions(),
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

  const takeScreenshotMutation = useMutation(
    rpcClient.utils.takeScreenshot.mutationOptions({
      onError: (error) => {
        toast.error("Failed to take screenshot", {
          description: error.message,
        });
      },
      onSuccess: (result) => {
        toast.success(`Screenshot saved to Downloads`, {
          action: {
            label: isMacOS() ? "Reveal in Finder" : "Show File",
            onClick: () => {
              showFileInFolderMutation.mutate({
                filepath: result.filepath,
              });
            },
          },
          closeButton: true,
          dismissible: true,
        });
      },
    }),
  );

  const handleOpenExternalClick = () => {
    openExternalLinkMutation.mutate({ url: project.urls.localhost });
  };

  const handleTakeScreenshot = async () => {
    if (!iframeRef.current) {
      toast.error("Unable to capture screenshot", {
        description: "Iframe not found",
      });
      return;
    }

    // Allow the dropdown close animation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const iframe = iframeRef.current;
    const rect = iframe.getBoundingClientRect();

    const bounds = {
      height: rect.height,
      width: rect.width,
      x: rect.left,
      y: rect.top,
    };

    takeScreenshotMutation.mutate({
      bounds,
      subdomain: project.subdomain,
    });
  };

  const handleExitVersion = () => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({ ...prev, selectedVersion: undefined }),
    });
  };

  const handleRestoreVersion = () => {
    setRestoreModalOpen(true);
  };

  return (
    <>
      <div className="bg-background shadow-sm pl-3 pr-2 py-1 w-full">
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="text-lg font-semibold text-foreground h-auto hover:bg-accent hover:text-accent-foreground gap-2 py-1 has-[>svg]:px-1"
                variant="ghost"
              >
                <SmallAppIcon
                  background={project.icon?.background}
                  icon={project.icon?.lucide}
                  size="md"
                />
                {project.title}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                onClick={() => {
                  setSettingsDialogOpen(true);
                }}
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <PenLine className="h-4 w-4 mr-2" />
                  <span>Open In</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => {
                      void openAppInMutation.mutateAsync({
                        subdomain: project.subdomain,
                        type: "terminal",
                      });
                    }}
                  >
                    <Terminal className="h-4 w-4" />
                    Open in Terminal
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void openAppInMutation.mutateAsync({
                        subdomain: project.subdomain,
                        type: "cursor",
                      });
                    }}
                  >
                    <PenLine className="h-4 w-4" />
                    Open in Cursor
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void openAppInMutation.mutateAsync({
                        subdomain: project.subdomain,
                        type: "vscode",
                      });
                    }}
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                    Open in VS Code
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void openAppInMutation.mutateAsync({
                        subdomain: project.subdomain,
                        type: "show-in-folder",
                      });
                    }}
                  >
                    <FolderOpenIcon className="h-4 w-4" />
                    {isMacOS() ? "Reveal in Finder" : "Show in File Manager"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenExternalClick}>
                    <ExternalLinkIcon className="h-4 w-4" />
                    Open in External Browser
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/15 focus:text-destructive"
                onSelect={onDeleteClick}
              >
                <TrashIcon />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center">
            {selectedVersion ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExitVersion}
                  size="sm"
                  variant="secondary"
                >
                  Exit
                </Button>
                <Button onClick={handleRestoreVersion} size="sm">
                  Restore this version
                </Button>
              </div>
            ) : (
              <>
                <ToolbarFavoriteAction project={project} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="gap-1" size="sm" variant="ghost">
                      <Share className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleTakeScreenshot}>
                      <Camera className="h-4 w-4" />
                      Screenshot
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        void openAppInMutation.mutateAsync({
                          subdomain: project.subdomain,
                          type: "show-in-folder",
                        });
                      }}
                    >
                      <FolderOpenIcon className="h-4 w-4" />
                      {isMacOS() ? "Reveal in Finder" : "Show in File Manager"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>

      <ProjectSettingsDialog
        dialogTitle="Project Settings"
        onOpenChange={setSettingsDialogOpen}
        open={settingsDialogOpen}
        subdomain={project.subdomain}
      />

      {selectedVersion && (
        <RestoreVersionModal
          isOpen={restoreModalOpen}
          onClose={() => {
            setRestoreModalOpen(false);
          }}
          onRestore={() => {
            // The modal handles the restore logic and navigation
            setRestoreModalOpen(false);
          }}
          projectSubdomain={project.subdomain}
          versionRef={selectedVersion}
        />
      )}
    </>
  );
}
