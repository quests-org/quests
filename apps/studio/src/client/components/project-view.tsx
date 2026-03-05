import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { AppView } from "@/client/components/app-view";
import { ProjectChat } from "@/client/components/project-chat";
import { ProjectExplorer } from "@/client/components/project-explorer";
import { ProjectFileViewerPanel } from "@/client/components/project-file-viewer-panel";
import { ProjectHeaderToolbar } from "@/client/components/project-header-toolbar";
import { Button } from "@/client/components/ui/button";
import { VersionList } from "@/client/components/version-list";
import { VersionOverlay } from "@/client/components/version-overlay";
import { useReload } from "@/client/hooks/use-reload";
import { hasVisibleProjectFiles } from "@/client/lib/project-file-groups";
import { cn } from "@/client/lib/utils";
import { type RPCOutput } from "@/client/rpc/client";
import { type ArtifactPanel } from "@/client/schemas/artifact-panel";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Activity, useCallback } from "react";
import { type DividerProps, Pane, SplitPane } from "react-split-pane";

function SplitDivider({
  className,
  direction,
  disabled,
  isDragging,
  onKeyDown,
  onPointerDown,
  style,
}: DividerProps) {
  const isHorizontal = direction === "horizontal";
  return (
    <div
      className={cn(
        "relative z-10 flex shrink-0 items-center justify-center",
        "bg-transparent transition-colors duration-200",
        "focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden",
        "after:absolute after:transition-all after:duration-200",
        isHorizontal
          ? "w-px cursor-col-resize after:inset-y-2 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:bg-transparent hover:after:scale-x-[3] hover:after:bg-muted-foreground/50"
          : "h-px cursor-row-resize after:inset-x-2 after:top-1/2 after:h-0.5 after:-translate-y-1/2 after:rounded-full after:bg-transparent hover:after:scale-y-[3] hover:after:bg-muted-foreground/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      data-dragging={isDragging}
      onKeyDown={disabled ? undefined : onKeyDown}
      onPointerDown={disabled ? undefined : onPointerDown}
      role="separator"
      style={{
        ...style,
        ...(isDragging && { backgroundColor: "hsl(var(--primary) / 0.5)" }),
      }}
      tabIndex={disabled ? -1 : 0}
    />
  );
}

const PANEL_SIZES = {
  centerMin: 300,
  chatDefault: 384,
  explorerDefault: 208,
  explorerMax: 308,
};

export function ProjectView({
  artifactPanel,
  attachedFolders,
  chatOpen,
  explorerOpen,
  files,
  hasAppModifications,
  project,
  selectedModelURI,
  selectedSessionId,
  showVersions,
  viewFileInfo,
}: {
  artifactPanel: ArtifactPanel | undefined;
  attachedFolders: RPCOutput["workspace"]["project"]["state"]["get"]["attachedFolders"];
  chatOpen: boolean;
  explorerOpen: boolean | undefined;
  files: RPCOutput["workspace"]["project"]["git"]["listFiles"] | undefined;
  hasAppModifications: boolean;
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedSessionId?: StoreId.Session;
  showVersions?: boolean;
  viewFileInfo:
    | RPCOutput["workspace"]["project"]["git"]["fileInfo"]
    | undefined;
}) {
  const navigate = useNavigate();

  const isViewingApp = artifactPanel?.type === "app";
  const isViewingFile = artifactPanel?.type === "file";
  const selectedVersion =
    artifactPanel?.type === "app" ? artifactPanel.versionRef : undefined;
  const showArtifactPanel = isViewingApp || isViewingFile;

  const currentViewFile: null | ProjectFileViewerFile = viewFileInfo
    ? { ...viewFileInfo, projectSubdomain: project.subdomain }
    : null;

  const handleAppSelect = () => {
    if (isViewingApp) {
      return;
    }
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({
        ...prev,
        artifactPanel: { type: "app" as const },
      }),
    });
  };

  const handleArtifactPanelClose = () => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({ ...prev, artifactPanel: undefined }),
    });
  };

  const handleFileSelect = ({
    filePath,
    versionRef,
  }: {
    filePath: string;
    versionRef: string;
  }) => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({
        ...prev,
        artifactPanel: {
          filePath,
          fileVersion: versionRef || undefined,
          type: "file" as const,
        },
      }),
    });
  };

  const hasProjectFiles = files ? hasVisibleProjectFiles(files) : false;
  const chatCollapsed = !chatOpen;
  const explorerCollapsed =
    explorerOpen === undefined ? !hasProjectFiles : !explorerOpen;

  const handleVersionsToggle = () => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({
        ...prev,
        showVersions: showVersions ? undefined : true,
      }),
    });
  };

  useReload(
    useCallback(() => {
      if (!isViewingApp) {
        window.location.reload();
      }
    }, [isViewingApp]),
  );

  const handleToggleChat = () => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({ ...prev, chatOpen: chatCollapsed }),
    });
  };

  const handleToggleExplorer = () => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({ ...prev, explorerOpen: explorerCollapsed }),
    });
  };

  const chatSize = chatCollapsed ? 0 : PANEL_SIZES.chatDefault;
  const explorerSize = explorerCollapsed ? 0 : PANEL_SIZES.explorerDefault;

  const sidebarProps = {
    isViewingApp,
    project,
    selectedModelURI,
    selectedSessionId,
    showVersions,
    versionRef: selectedVersion,
  };

  const explorerPane = (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-background",
        !showArtifactPanel && "border-l",
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Project
        </h3>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={handleToggleExplorer}
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProjectExplorer
          activeFilePath={
            artifactPanel?.type === "file" ? artifactPanel.filePath : null
          }
          attachedFolders={attachedFolders}
          files={files}
          isAppViewOpen={isViewingApp}
          onAppSelect={handleAppSelect}
          onFileSelect={handleFileSelect}
          project={project}
          showAppEntry={hasAppModifications}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <ProjectHeaderToolbar
        canCollapseChat={showArtifactPanel}
        chatCollapsed={chatCollapsed}
        explorerCollapsed={explorerCollapsed}
        onToggleChat={handleToggleChat}
        onToggleExplorer={handleToggleExplorer}
        project={project}
        selectedSessionId={selectedSessionId}
        showChatToggle={showArtifactPanel || hasAppModifications}
        versionRef={selectedVersion}
      />

      <div className={cn("min-h-0 flex-1", !showArtifactPanel && "border-t")}>
        {showArtifactPanel ? (
          <SplitPane
            direction="horizontal"
            divider={SplitDivider}
            onResizeEnd={(sizes) => {
              const [newChat, newCenter, newExplorer] = sizes;
              const chatNowOpen = (newChat ?? 0) > 0;
              const explorerNowOpen = (newExplorer ?? 0) > 0;
              const centerTooSmall = (newCenter ?? 0) < PANEL_SIZES.centerMin;
              if (centerTooSmall) {
                void navigate({
                  from: "/projects/$subdomain",
                  params: { subdomain: project.subdomain },
                  replace: true,
                  search: (prev) => ({ ...prev, artifactPanel: undefined }),
                });
                return;
              }
              if (chatNowOpen !== !chatCollapsed) {
                void navigate({
                  from: "/projects/$subdomain",
                  params: { subdomain: project.subdomain },
                  replace: true,
                  search: (prev) => ({ ...prev, chatOpen: chatNowOpen }),
                });
              }
              if (explorerNowOpen !== !explorerCollapsed) {
                void navigate({
                  from: "/projects/$subdomain",
                  params: { subdomain: project.subdomain },
                  replace: true,
                  search: (prev) => ({
                    ...prev,
                    explorerOpen: explorerNowOpen,
                  }),
                });
              }
            }}
            style={{ height: "100%" }}
          >
            <Pane minSize={PANEL_SIZES.chatDefault} size={chatSize}>
              {showVersions && (
                <div className="flex h-full flex-col overflow-hidden bg-background">
                  <div className="flex items-center justify-between border-b p-2">
                    <h2 className="px-2 font-semibold">Versions</h2>
                    <Button
                      onClick={handleVersionsToggle}
                      size="icon"
                      variant="ghost"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <VersionList
                      // Very basic filtering for now
                      filterByPath="./src"
                      isViewingApp={isViewingApp}
                      projectSubdomain={project.subdomain}
                      versionRef={selectedVersion}
                    />
                  </div>
                </div>
              )}
              <Activity mode={showVersions ? "hidden" : "visible"}>
                <ProjectChat {...sidebarProps} />
              </Activity>
            </Pane>

            <Pane minSize={200}>
              <div
                className={cn(
                  "flex h-full flex-1 flex-col overflow-hidden border-t bg-secondary p-2",
                  !chatCollapsed && "rounded-tl-lg border-l",
                  !explorerCollapsed && "rounded-tr-lg border-r",
                )}
              >
                {isViewingFile && currentViewFile ? (
                  <div className="flex h-full overflow-hidden">
                    <ProjectFileViewerPanel
                      file={currentViewFile}
                      onClose={handleArtifactPanelClose}
                    />
                  </div>
                ) : (
                  <div className="relative flex flex-1 flex-col">
                    <AppView
                      app={project}
                      className="overflow-hidden rounded-lg"
                      isVersionsOpen={showVersions}
                      onClose={handleArtifactPanelClose}
                      onVersionsToggle={handleVersionsToggle}
                      shouldReload={!selectedVersion}
                    />

                    {selectedVersion && (
                      <VersionOverlay
                        projectSubdomain={project.subdomain}
                        versionRef={selectedVersion}
                      />
                    )}
                  </div>
                )}
              </div>
            </Pane>

            <Pane
              maxSize={PANEL_SIZES.explorerMax}
              minSize={PANEL_SIZES.explorerDefault}
              size={explorerSize}
            >
              {explorerPane}
            </Pane>
          </SplitPane>
        ) : (
          <SplitPane
            direction="horizontal"
            divider={SplitDivider}
            onResizeEnd={(sizes) => {
              const explorerNowOpen = (sizes[1] ?? 0) > 0;
              if (explorerNowOpen !== !explorerCollapsed) {
                void navigate({
                  from: "/projects/$subdomain",
                  params: { subdomain: project.subdomain },
                  replace: true,
                  search: (prev) => ({
                    ...prev,
                    explorerOpen: explorerNowOpen,
                  }),
                });
              }
            }}
            style={{ height: "100%" }}
          >
            <Pane>
              <ProjectChat {...sidebarProps} isChatOnly />
            </Pane>

            <Pane
              maxSize={PANEL_SIZES.explorerDefault + 100}
              minSize={PANEL_SIZES.explorerDefault}
              size={explorerSize}
            >
              {explorerPane}
            </Pane>
          </SplitPane>
        )}
      </div>
    </div>
  );
}
