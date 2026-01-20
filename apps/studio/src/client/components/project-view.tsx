import { projectSidebarCollapsedAtomFamily } from "@/client/atoms/project-sidebar";
import { AppView } from "@/client/components/app-view";
import { ProjectHeaderToolbar } from "@/client/components/project-header-toolbar";
import { ProjectSidebar } from "@/client/components/project-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";
import { VersionOverlay } from "@/client/components/version-overlay";
import { useReload } from "@/client/hooks/use-reload";
import { cn } from "@/client/lib/utils";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";

export function ProjectView({
  hasAppModifications,
  project,
  selectedModelURI,
  selectedSessionId,
  selectedVersion,
}: {
  hasAppModifications: boolean;
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedSessionId?: StoreId.Session;
  selectedVersion: string | undefined;
}) {
  const sidebarCollapsed = useAtomValue(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const setSidebarCollapsed = useSetAtom(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const panelRef = usePanelRef();
  const lastAtomValueRef = useRef(sidebarCollapsed);

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
  };

  // TODO: Remove chat- after 2026-03-01
  const isChatOnly =
    !hasAppModifications || project.subdomain.startsWith("chat-");

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      <ProjectHeaderToolbar
        hasAppModifications={hasAppModifications}
        project={project}
        selectedVersion={selectedVersion}
      />

      {isChatOnly ? (
        <div className="flex h-full w-full flex-1 items-start justify-center overflow-hidden border-t">
          <div className="flex h-full w-full max-w-3xl flex-col bg-background">
            <ProjectSidebar {...sidebarProps} />
          </div>
        </div>
      ) : (
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
              <ProjectSidebar {...sidebarProps} />
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
      )}
    </div>
  );
}
