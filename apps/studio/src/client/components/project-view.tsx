import { projectSidebarCollapsedAtomFamily } from "@/client/atoms/project-sidebar";
import { AppView } from "@/client/components/app-view";
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

  if (!hasAppModifications) {
    return (
      <div className="flex h-full w-full items-start justify-center border-t">
        <div className="flex h-full w-full max-w-3xl flex-col bg-background">
          <ProjectSidebar
            project={project}
            selectedModelURI={selectedModelURI}
            selectedSessionId={selectedSessionId}
            selectedVersion={selectedVersion}
          />
        </div>
      </div>
    );
  }

  return (
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
        <ProjectSidebar
          project={project}
          selectedModelURI={selectedModelURI}
          selectedSessionId={selectedSessionId}
          selectedVersion={selectedVersion}
        />
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
  );
}
