import { projectSidebarCollapsedAtomFamily } from "@/client/atoms/project-sidebar";
import { AppView } from "@/client/components/app-view";
import { ProjectChat } from "@/client/components/project-chat";
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
import { cn } from "@/client/lib/utils";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { Activity, useCallback, useEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";

export function ProjectView({
  hasAppModifications,
  project,
  selectedModelURI,
  selectedSessionId,
  selectedVersion,
  showVersions,
}: {
  hasAppModifications: boolean;
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedSessionId?: StoreId.Session;
  selectedVersion: string | undefined;
  showVersions?: boolean;
}) {
  const navigate = useNavigate();
  const sidebarCollapsed = useAtomValue(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const setSidebarCollapsed = useSetAtom(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const panelRef = usePanelRef();
  const lastAtomValueRef = useRef(sidebarCollapsed);

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
    // panelRef is not stable, so we need this check to avoid an infinite loop
    // This may be a bug and fixed in a future version of react-resizable-panels
    if (lastAtomValueRef.current === sidebarCollapsed) {
      return;
    }

    lastAtomValueRef.current = sidebarCollapsed;

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
        hasAppModifications={hasAppModifications}
        project={project}
        selectedSessionId={selectedSessionId}
        selectedVersion={selectedVersion}
      />

      {hasAppModifications ? (
        <div className="flex flex-1 overflow-hidden">
          <ResizablePanelGroup orientation="horizontal">
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

                const isCollapsed = panel.isCollapsed();
                if (lastAtomValueRef.current !== isCollapsed) {
                  lastAtomValueRef.current = isCollapsed;
                  setSidebarCollapsed(isCollapsed);
                }
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

            <ResizableHandle className="bg-transparent transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 data-[separator='active']:bg-primary/50 data-[separator='hover']:scale-x-[3] data-[separator='hover']:bg-muted-foreground" />

            <ResizablePanel>
              <div
                className={cn(
                  "flex h-full flex-1 flex-col overflow-hidden border-t bg-secondary p-2",
                  !sidebarCollapsed && "rounded-tl-lg border-l",
                )}
              >
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
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        <div className="flex min-h-0 w-full flex-1 border-t">
          <ProjectChat {...sidebarProps} isChatOnly />
        </div>
      )}
    </div>
  );
}
