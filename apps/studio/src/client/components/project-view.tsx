import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import {
  projectFilesPanelCollapsedAtomFamily,
  projectSidebarCollapsedAtomFamily,
} from "@/client/atoms/project-sidebar";
import { AppView } from "@/client/components/app-view";
import { ProjectChat } from "@/client/components/project-chat";
import { ProjectExplorer } from "@/client/components/project-explorer";
import { ProjectFileViewerPanel } from "@/client/components/project-file-viewer-panel";
import { ProjectHeaderToolbar } from "@/client/components/project-header-toolbar";
import { Button } from "@/client/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";
import { VersionList } from "@/client/components/version-list";
import { VersionOverlay } from "@/client/components/version-overlay";
import { useCollapsiblePanel } from "@/client/hooks/use-collapsible-panel";
import { useReload } from "@/client/hooks/use-reload";
import { hasVisibleProjectFiles } from "@/client/lib/project-file-groups";
import { cn } from "@/client/lib/utils";
import { type RPCOutput } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { Activity, useCallback, useMemo } from "react";

const RESIZABLE_HANDLE_CLASS =
  "bg-transparent transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 data-[separator='active']:bg-primary/50 data-[separator='hover']:scale-x-[3] data-[separator='hover']:bg-muted-foreground";

export function ProjectView({
  attachedFolders,
  files,
  hasAppModifications,
  panel,
  project,
  selectedModelURI,
  selectedSessionId,
  showVersions,
  viewFileInfo,
}: {
  attachedFolders: RPCOutput["workspace"]["project"]["state"]["get"]["attachedFolders"];
  files: RPCOutput["workspace"]["project"]["git"]["listFiles"] | undefined;
  hasAppModifications: boolean;
  panel:
    | undefined
    | { filePath: string; fileVersion?: string; type: "file" }
    | { type: "app"; versionRef?: string };
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedSessionId?: StoreId.Session;
  showVersions?: boolean;
  viewFileInfo:
    | RPCOutput["workspace"]["project"]["git"]["fileInfo"]
    | undefined;
}) {
  const navigate = useNavigate();

  const isViewingApp = panel?.type === "app";
  const isViewingFile = panel?.type === "file";
  const selectedVersion = panel?.type === "app" ? panel.versionRef : undefined;
  const showAppPanel = isViewingApp || isViewingFile;

  const currentViewFile = useMemo((): null | ProjectFileViewerFile => {
    if (!viewFileInfo) {
      return null;
    }
    return {
      ...viewFileInfo,
      projectSubdomain: project.subdomain,
    };
  }, [viewFileInfo, project.subdomain]);

  const handleAppSelect = useCallback(() => {
    if (isViewingApp) {
      return;
    }
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({ ...prev, panel: { type: "app" as const } }),
    });
  }, [isViewingApp, navigate, project.subdomain]);

  const handleAppClose = useCallback(() => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({ ...prev, panel: undefined }),
    });
  }, [navigate, project.subdomain]);

  const handleFileSelect = useCallback(
    ({ filePath, versionRef }: { filePath: string; versionRef: string }) => {
      void navigate({
        from: "/projects/$subdomain",
        params: { subdomain: project.subdomain },
        replace: true,
        search: (prev) => ({
          ...prev,
          panel: {
            filePath,
            fileVersion: versionRef || undefined,
            type: "file" as const,
          },
        }),
      });
    },
    [navigate, project.subdomain],
  );

  const handleFileViewerClose = useCallback(() => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({ ...prev, panel: undefined }),
    });
  }, [navigate, project.subdomain]);

  const sidebarCollapsed = useAtomValue(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const setSidebarCollapsed = useSetAtom(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const filesPanelCollapsed = useAtomValue(
    projectFilesPanelCollapsedAtomFamily(project.subdomain),
  );
  const setFilesPanelCollapsed = useSetAtom(
    projectFilesPanelCollapsedAtomFamily(project.subdomain),
  );

  const hasProjectFiles = useMemo(
    () => (files ? hasVisibleProjectFiles(files) : false),
    [files],
  );

  const panelRef = useCollapsiblePanel({
    collapsed: sidebarCollapsed,
    onCollapsedChange: setSidebarCollapsed,
    toastMessage: "Make the window wider to show the chat panel.",
  });

  const filesPanelRef = useCollapsiblePanel({
    collapsed: filesPanelCollapsed,
    onCollapsedChange: setFilesPanelCollapsed,
    toastMessage: "Make the window wider to show the files panel.",
  });

  const handleVersionsToggle = useCallback(() => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: project.subdomain },
      replace: true,
      search: (prev) => ({
        ...prev,
        showVersions: showVersions ? undefined : true,
      }),
    });
  }, [navigate, project.subdomain, showVersions]);

  useReload(
    useCallback(() => {
      if (!isViewingApp) {
        window.location.reload();
      }
    }, [isViewingApp]),
  );

  const sidebarProps = {
    isViewingApp,
    project,
    selectedModelURI,
    selectedSessionId,
    showVersions,
    versionRef: selectedVersion,
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <ProjectHeaderToolbar
        project={project}
        selectedSessionId={selectedSessionId}
        showChatToggle={showAppPanel || hasAppModifications}
        showFilesToggle={hasProjectFiles}
        versionRef={selectedVersion}
      />

      <ResizablePanelGroup
        className={cn("min-h-0 flex-1", showAppPanel ? "min-w-0" : "border-t")}
        orientation="horizontal"
      >
        {showAppPanel && (
          <>
            <ResizablePanel
              collapsedSize="0px"
              collapsible
              defaultSize="24rem"
              maxSize="50%"
              minSize="24rem"
              onResize={() => {
                const resizablePanel = panelRef.current;
                if (!resizablePanel) {
                  return;
                }

                setSidebarCollapsed(resizablePanel.isCollapsed());
              }}
              panelRef={panelRef}
            >
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
            </ResizablePanel>

            <ResizableHandle className={RESIZABLE_HANDLE_CLASS} />

            <ResizablePanel minSize="20rem">
              <div
                className={cn(
                  "flex h-full flex-1 flex-col overflow-hidden border-t bg-secondary p-2",
                  !sidebarCollapsed && "rounded-tl-lg border-l",
                  hasProjectFiles &&
                    !filesPanelCollapsed &&
                    "rounded-tr-lg border-r",
                )}
              >
                {isViewingFile && currentViewFile ? (
                  <div className="flex h-full overflow-hidden">
                    <ProjectFileViewerPanel
                      file={currentViewFile}
                      onClose={handleFileViewerClose}
                    />
                  </div>
                ) : (
                  <div className="relative flex flex-1 flex-col">
                    <AppView
                      app={project}
                      className="overflow-hidden rounded-lg"
                      isVersionsOpen={showVersions}
                      onClose={handleAppClose}
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
            </ResizablePanel>
          </>
        )}

        {!showAppPanel && (
          <ResizablePanel minSize="20rem">
            <ProjectChat {...sidebarProps} isChatOnly />
          </ResizablePanel>
        )}

        {hasProjectFiles && (
          <>
            <ResizableHandle className={RESIZABLE_HANDLE_CLASS} />
            <ResizablePanel
              collapsedSize="0px"
              collapsible
              defaultSize={filesPanelCollapsed ? "0px" : "13rem"}
              maxSize="40%"
              minSize="13rem"
              onResize={() => {
                const resizablePanel = filesPanelRef.current;
                if (!resizablePanel) {
                  return;
                }

                setFilesPanelCollapsed(resizablePanel.isCollapsed());
              }}
              panelRef={filesPanelRef}
            >
              <div
                className={cn(
                  "flex h-full flex-col overflow-hidden bg-background",
                  !showAppPanel && "border-l",
                )}
              >
                <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Project
                  </h3>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFilesPanelCollapsed(true);
                    }}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ProjectExplorer
                    activeFilePath={
                      panel?.type === "file" ? panel.filePath : null
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
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
