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
  ChevronDown,
  Clipboard,
  FolderOpenIcon,
  MessageCircle,
  PanelLeftClose,
  Save,
  SettingsIcon,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { TrashIcon } from "./icons";
import { RestoreVersionModal } from "./restore-version-modal";
import { CMD, Cursor, ITerm, MacOSTerminal, VSCode } from "./service-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const EDITOR_ICON_MAP: Record<
  SupportedEditorId,
  React.ComponentType<{ className?: string }>
> = {
  cmd: CMD,
  cursor: Cursor,
  iterm: ITerm,
  powershell: Terminal,
  terminal: MacOSTerminal,
  vscode: VSCode,
};

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

  const copyScreenshotMutation = useMutation(
    rpcClient.utils.copyScreenshotToClipboard.mutationOptions({
      onError: (error) => {
        toast.error("Failed to copy screenshot", {
          description: error.message,
        });
      },
      onSuccess: () => {
        toast.success("Screenshot copied to clipboard");
      },
    }),
  );

  const { data: supportedEditors = [] } = useQuery<SupportedEditor[]>(
    rpcClient.utils.getSupportedEditors.queryOptions(),
  );

  const handleTakeScreenshot = async () => {
    if (!iframeRef.current) {
      toast.error("Unable to capture screenshot", {
        description: "Iframe not found",
      });
      return;
    }

    const bounds = getScreenshotBounds(iframeRef.current);

    // Allow the dropdown close animation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    takeScreenshotMutation.mutate({
      bounds,
      subdomain: project.subdomain,
    });
  };

  const handleCopyScreenshot = async () => {
    if (!iframeRef.current) {
      toast.error("Unable to capture screenshot", {
        description: "Iframe not found",
      });
      return;
    }

    const bounds = getScreenshotBounds(iframeRef.current);

    // Allow the dropdown close animation to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    copyScreenshotMutation.mutate({
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
      <div className="bg-background pl-3 pr-2 py-2 w-full">
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
              className="ml-1 transition-all duration-300 ease-in-out h-7 inline-flex items-center"
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
                    <Button className="gap-1 h-7" size="sm" variant="secondary">
                      <span>Open in</span>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const availableEditors = supportedEditors.filter(
                            (editor) => editor.available,
                          );
                          const editorIcons = availableEditors.slice(0, 3);

                          return editorIcons.map((editor) => {
                            const Icon = EDITOR_ICON_MAP[editor.id];
                            return (
                              <Icon className="size-3.5" key={editor.id} />
                            );
                          });
                        })()}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        void openAppInMutation.mutateAsync({
                          subdomain: project.subdomain,
                          type: "show-in-folder",
                        });
                      }}
                    >
                      {isMacOS() ? (
                        <svg
                          className="size-4"
                          height="24"
                          viewBox="0 0 24 24"
                          width="24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21.001 3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm-1 2h-8.465Q10.5 7.966 10.5 13h3a17 17 0 0 0-.107 2.877c1.226-.211 2.704-.777 4.027-1.71l1.135 1.665c-1.642 1.095-3.303 1.779-4.976 2.043q.078.555.184 1.125H20zM6.556 14.168l-1.11 1.664C7.603 17.27 9.793 18 12.001 18v-2c-1.792 0-3.602-.603-5.445-1.832M17 7a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1M7 7c-.552 0-1 .452-1 1v1a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1"
                            fill="currentColor"
                          />
                        </svg>
                      ) : (
                        <FolderOpenIcon className="size-4" />
                      )}
                      {isMacOS() ? "Reveal in Finder" : "Show in file manager"}
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
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="gap-1 h-7" size="sm" variant="secondary">
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyScreenshot}>
                      <Clipboard className="h-4 w-4" />
                      Copy screenshot
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleTakeScreenshot}>
                      <Save className="h-4 w-4" />
                      Save screenshot
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

function getScreenshotBounds(iframeElement: HTMLIFrameElement) {
  const rect = iframeElement.getBoundingClientRect();

  return {
    height: rect.height,
    width: rect.width,
    x: rect.left,
    y: rect.top,
  };
}
