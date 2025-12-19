import { projectSidebarCollapsedAtomFamily } from "@/client/atoms/project-sidebar";
import { AppView } from "@/client/components/app-view";
import { ProjectSidebar } from "@/client/components/project-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";
import { VersionOverlay } from "@/client/components/version-overlay";
import { cn } from "@/client/lib/utils";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { type ImperativePanelHandle } from "react-resizable-panels";

export function ProjectViewApp({
  project,
  selectedModelURI,
  selectedVersion,
}: {
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedVersion: string | undefined;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(
    projectSidebarCollapsedAtomFamily(project.subdomain),
  );
  const panelRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (sidebarCollapsed && !panel.isCollapsed()) {
      panel.collapse();
    } else if (!sidebarCollapsed && panel.isCollapsed()) {
      panel.expand();
    }
  }, [sidebarCollapsed]);

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel
        collapsedSize={0}
        collapsible
        defaultSize={33}
        maxSize={50}
        minSize={33}
        onCollapse={() => {
          setSidebarCollapsed(true);
        }}
        onExpand={() => {
          setSidebarCollapsed(false);
        }}
        ref={panelRef}
      >
        <ProjectSidebar
          project={project}
          selectedModelURI={selectedModelURI}
          selectedVersion={selectedVersion}
        />
      </ResizablePanel>

      <ResizableHandle className="bg-transparent data-[resize-handle-state='hover']:bg-muted-foreground data-[resize-handle-state='drag']:bg-primary/50 transition-all duration-200 data-[resize-handle-state='hover']:scale-x-[3]" />

      <ResizablePanel defaultSize={67} minSize={50}>
        <div
          className={cn(
            "flex-1 flex flex-col p-2 bg-secondary border-t overflow-hidden h-full",
            !sidebarCollapsed && "border-l rounded-tl-lg",
          )}
        >
          <div className="flex-1 flex flex-col relative">
            <AppView
              app={project}
              className="rounded-lg overflow-hidden"
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
