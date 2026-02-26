import { projectFileViewerAtom } from "@/client/atoms/project-file-viewer";
import {
  projectFilesPanelCollapsedAtomFamily,
  projectSidebarCollapsedAtomFamily,
} from "@/client/atoms/project-sidebar";
import { AppView } from "@/client/components/app-view";
import { ProjectChat } from "@/client/components/project-chat";
import { ProjectFileListPanel } from "@/client/components/project-file-list-panel";
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
import { useReload } from "@/client/hooks/use-reload";
import { hasVisibleProjectFiles } from "@/client/lib/project-file-groups";
import { cn } from "@/client/lib/utils";
import { rpcClient, type RPCOutput } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { Activity, useCallback, useEffect, useMemo } from "react";
import { usePanelRef } from "react-resizable-panels";

const RESIZABLE_HANDLE_CLASS =
  "bg-transparent transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 data-[separator='active']:bg-primary/50 data-[separator='hover']:scale-x-[3] data-[separator='hover']:bg-muted-foreground";

export function ProjectView({
  attachedFolders,
  hasAppModifications,
  project,
  selectedModelURI,
  selectedSessionId,
  selectedVersion,
  showVersions,
}: {
  attachedFolders: RPCOutput["workspace"]["project"]["state"]["get"]["attachedFolders"];
  hasAppModifications: boolean;
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedSessionId?: StoreId.Session;
  selectedVersion: string | undefined;
  showVersions?: boolean;
}) {
  const navigate = useNavigate();
  const fileViewerState = useAtomValue(projectFileViewerAtom);
  const fileViewerOpen = fileViewerState.isOpen;
  const showFileViewerPanel =
    fileViewerState.isOpen && fileViewerState.mode === "panel";
  const showAppPanel = hasAppModifications || fileViewerOpen;
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

  const { data: files } = useQuery(
    rpcClient.workspace.project.git.live.listFiles.experimental_liveOptions({
      input: { projectSubdomain: project.subdomain },
    }),
  );
  const hasProjectFiles = useMemo(
    () => (files ? hasVisibleProjectFiles(files) : false),
    [files],
  );

  const panelRef = usePanelRef();
  const filesPanelRef = usePanelRef();

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
      if (!hasAppModifications) {
        window.location.reload();
      }
    }, [hasAppModifications]),
  );

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (sidebarCollapsed) {
      panel.collapse();
    } else {
      panel.expand();
    }
  }, [sidebarCollapsed, panelRef]);

  useEffect(() => {
    const panel = filesPanelRef.current;
    if (!panel) {
      return;
    }

    if (filesPanelCollapsed) {
      panel.collapse();
    } else {
      panel.expand();
    }
  }, [filesPanelCollapsed, filesPanelRef]);

  const sidebarProps = {
    project,
    selectedModelURI,
    selectedSessionId,
    selectedVersion,
    showVersions,
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <ProjectHeaderToolbar
        project={project}
        selectedSessionId={selectedSessionId}
        selectedVersion={selectedVersion}
        showChatToggle={showAppPanel}
        showFilesToggle={hasProjectFiles}
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
                const panel = panelRef.current;
                if (!panel) {
                  return;
                }

                setSidebarCollapsed(panel.isCollapsed());
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
                      projectSubdomain={project.subdomain}
                      selectedVersion={selectedVersion}
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
                {fileViewerOpen ? (
                  <div className="flex h-full overflow-hidden">
                    {showFileViewerPanel && <ProjectFileViewerPanel />}
                  </div>
                ) : (
                  <div className="relative flex flex-1 flex-col">
                    <AppView
                      app={project}
                      className="overflow-hidden rounded-lg"
                      isVersionsOpen={showVersions}
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
              defaultSize="13rem"
              maxSize="40%"
              minSize="13rem"
              onResize={() => {
                const panel = filesPanelRef.current;
                if (!panel) {
                  return;
                }

                setFilesPanelCollapsed(panel.isCollapsed());
              }}
              panelRef={filesPanelRef}
            >
              <div
                className={cn(
                  "flex h-full flex-col overflow-hidden bg-background",
                  !showAppPanel && "border-l",
                )}
              >
                <div className="shrink-0 border-b px-3 py-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Files
                  </h3>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <ProjectFileListPanel
                    attachedFolders={attachedFolders}
                    files={files}
                    project={project}
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
