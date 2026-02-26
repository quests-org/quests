import type {
  SupportedEditor,
  SupportedEditorId,
} from "@/shared/schemas/editors";

import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import { Button } from "@/client/components/ui/button";
import { Toggle } from "@/client/components/ui/toggle";
import { ToolbarFavoriteAction } from "@/client/components/ui/toolbar-favorite-action";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { getRevealInFolderLabel, isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { OpenAppInTypeSchema } from "@/shared/schemas/editors";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
  ChevronDown,
  FileArchive,
  Files,
  FolderOpenIcon,
  MessageCircle,
  PanelLeftClose,
  PanelRightClose,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  projectFilesPanelCollapsedAtomFamily,
  projectSidebarCollapsedAtomFamily,
} from "../atoms/project-sidebar";
import { ExportZipModal } from "./export-zip-modal";
import { ProjectMenu } from "./project-menu";
import { ProjectUsageSummary } from "./project-usage-summary";
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
  project: WorkspaceAppProject;
  selectedSessionId?: StoreId.Session;
  selectedVersion?: string;
  showChatToggle: boolean;
  showFilesToggle: boolean;
}

export function ProjectHeaderToolbar({
  project,
  selectedSessionId,
  selectedVersion,
  showChatToggle,
  showFilesToggle,
}: ProjectHeaderToolbarProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const [filesPanelCollapsed, setFilesPanelCollapsed] = useAtom(
    projectFilesPanelCollapsedAtomFamily(project.subdomain),
  );
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [exportZipModalOpen, setExportZipModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: supportedEditors = [] } = useQuery<SupportedEditor[]>(
    rpcClient.utils.getSupportedEditors.queryOptions(),
  );

  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  const isDeveloperMode = preferences?.developerMode;

  const openAppInMutation = useMutation(
    rpcClient.utils.openAppIn.mutationOptions({
      onError: (error) => {
        toast.error("Failed to open in app", {
          description: error.message,
        });
      },
    }),
  );

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

  const availableEditors = supportedEditors.filter(
    (editor) => editor.available && ["cursor", "vscode"].includes(editor.id),
  );

  const availableTerminals = supportedEditors.filter(
    (editor) => editor.available && ["iterm", "terminal"].includes(editor.id),
  );

  return (
    <>
      <div className="w-full bg-background py-2 pr-2 pl-3">
        <div className="flex items-center gap-2">
          <ProjectMenu
            onSettingsClick={() => {
              setSettingsDialogOpen(true);
            }}
            project={project}
            selectedSessionId={selectedSessionId}
          />

          {showChatToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  aria-label={
                    sidebarCollapsed ? "Show sidebar" : "Hide sidebar"
                  }
                  onPressedChange={() => {
                    setSidebarCollapsed(!sidebarCollapsed);
                  }}
                  pressed={sidebarCollapsed}
                  size="sm"
                  variant={sidebarCollapsed ? "outline" : "default"}
                >
                  {sidebarCollapsed ? (
                    <>
                      <MessageCircle className="size-4" />
                      <span>Chat</span>
                    </>
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {sidebarCollapsed ? "Show chat" : "Hide chat"}
              </TooltipContent>
            </Tooltip>
          )}

          <div className="flex-1" />

          <div className="flex min-w-0 items-center gap-3">
            {isDeveloperMode && (
              <div className="min-w-0 shrink truncate">
                <ProjectUsageSummary project={project} />
              </div>
            )}
            {showFilesToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    aria-label={
                      filesPanelCollapsed ? "Show files" : "Hide files"
                    }
                    onPressedChange={() => {
                      setFilesPanelCollapsed(!filesPanelCollapsed);
                    }}
                    pressed={filesPanelCollapsed}
                    size="sm"
                    variant={filesPanelCollapsed ? "outline" : "default"}
                  >
                    {filesPanelCollapsed ? (
                      <>
                        <Files className="size-4" />
                        <span>Files</span>
                      </>
                    ) : (
                      <PanelRightClose className="size-4" />
                    )}
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  {filesPanelCollapsed ? "Show files" : "Hide files"}
                </TooltipContent>
              </Tooltip>
            )}

            {selectedVersion ? (
              <div className="flex shrink-0 items-center gap-2">
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
              <div className="flex shrink-0 items-center gap-2">
                <ToolbarFavoriteAction project={project} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-7 gap-1" size="sm" variant="secondary">
                      <span>Open in</span>
                      <ChevronDown className="size-3.5 opacity-80" />
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
                      {getRevealInFolderLabel()}
                    </DropdownMenuItem>

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
                                  type: OpenAppInTypeSchema.parse(editor.id),
                                });
                              }}
                            >
                              <Icon className="size-4" />
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
                                  type: OpenAppInTypeSchema.parse(editor.id),
                                });
                              }}
                            >
                              <Icon className="size-4" />
                              {editor.name}
                            </DropdownMenuItem>
                          );
                        })}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-7 gap-1" size="sm" variant="secondary">
                      Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setExportZipModalOpen(true);
                      }}
                    >
                      <FileArchive className="size-4" />
                      Export as zip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProjectSettingsDialog
        onOpenChange={setSettingsDialogOpen}
        open={settingsDialogOpen}
        project={project}
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

      <ExportZipModal
        isOpen={exportZipModalOpen}
        onClose={() => {
          setExportZipModalOpen(false);
        }}
        project={project}
      />
    </>
  );
}
