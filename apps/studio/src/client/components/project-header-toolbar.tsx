import type {
  SupportedEditor,
  SupportedEditorId,
} from "@/shared/schemas/editors";

import { SmallAppIcon } from "@/client/components/app-icon";
import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import { Button } from "@/client/components/ui/button";
import { ToolbarFavoriteAction } from "@/client/components/ui/toolbar-favorite-action";
import { cn, isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { OpenAppInTypeSchema } from "@/shared/schemas/editors";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  ChevronDown,
  ExternalLinkIcon,
  FolderOpenIcon,
  MessageCircle,
  PanelLeftClose,
  PenLine,
  SettingsIcon,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EDITOR_ICON_MAP: Record<SupportedEditorId, typeof PenLine> = {
  cmd: Terminal,
  cursor: PenLine,
  iterm: Terminal,
  powershell: Terminal,
  terminal: Terminal,
  vscode: PenLine,
};

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
  onSidebarToggle: () => void;
  project: WorkspaceAppProject;
  selectedVersion?: string;
  sidebarCollapsed?: boolean;
}

export function ProjectHeaderToolbar({
  iframeRef,
  onDeleteClick,
  onSidebarToggle,
  project,
  selectedVersion,
  sidebarCollapsed,
}: ProjectHeaderToolbarProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const navigate = useNavigate();

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

  const { data: supportedEditors = [] } = useQuery<SupportedEditor[]>(
    rpcClient.utils.getSupportedEditors.queryOptions(),
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
          <div
            className={cn(
              "flex items-center gap-2",
              !sidebarCollapsed && "w-96 shrink-0 justify-between pr-5",
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="font-semibold text-foreground h-auto hover:bg-accent hover:text-accent-foreground gap-2 py-1 has-[>svg]:px-1"
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
                          type: "show-in-folder",
                        });
                      }}
                    >
                      <FolderOpenIcon className="h-4 w-4" />
                      {isMacOS() ? "Reveal in Finder" : "Show in file manager"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenExternalClick}>
                      <ExternalLinkIcon className="h-4 w-4" />
                      External browser
                    </DropdownMenuItem>

                    {(() => {
                      const availableEditors = supportedEditors.filter(
                        (editor) =>
                          editor.available &&
                          ["cursor", "vscode"].includes(editor.id),
                      );
                      const availableTerminals = supportedEditors.filter(
                        (editor) =>
                          editor.available &&
                          ["iterm", "terminal"].includes(editor.id),
                      );

                      return (
                        <>
                          {availableEditors.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              {availableEditors.map((editor) => {
                                const Icon = EDITOR_ICON_MAP[editor.id];

                                return (
                                  <DropdownMenuItem
                                    key={editor.id}
                                    onClick={() => {
                                      void openAppInMutation.mutateAsync({
                                        subdomain: project.subdomain,
                                        type: OpenAppInTypeSchema.parse(
                                          editor.id,
                                        ),
                                      });
                                    }}
                                  >
                                    <Icon className="h-4 w-4" />
                                    {editor.name}
                                  </DropdownMenuItem>
                                );
                              })}
                            </>
                          )}

                          {availableTerminals.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              {availableTerminals.map((editor) => {
                                const Icon = EDITOR_ICON_MAP[editor.id];

                                return (
                                  <DropdownMenuItem
                                    key={editor.id}
                                    onClick={() => {
                                      void openAppInMutation.mutateAsync({
                                        subdomain: project.subdomain,
                                        type: OpenAppInTypeSchema.parse(
                                          editor.id,
                                        ),
                                      });
                                    }}
                                  >
                                    <Icon className="h-4 w-4" />
                                    {editor.name}
                                  </DropdownMenuItem>
                                );
                              })}
                            </>
                          )}
                        </>
                      );
                    })()}
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

            <Button
              className="ml-1 transition-all duration-300 ease-in-out h-7 inline-flex items-center select-none"
              onClick={onSidebarToggle}
              size="sm"
              title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              variant={sidebarCollapsed ? "secondary" : "ghost"}
            >
              {sidebarCollapsed ? (
                <>
                  <MessageCircle className="h-4 w-4" />
                  <span>Chat</span>
                </>
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

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
              <div className="flex items-center gap-2">
                <ToolbarFavoriteAction project={project} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="gap-1 h-7 select-none"
                      size="sm"
                      variant="secondary"
                    >
                      Share
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
              </div>
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
