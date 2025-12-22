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
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";

export function ProjectViewApp({
  project,
  selectedModelURI,
  selectedVersion,
}: {
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
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
          selectedVersion={selectedVersion}
        />
      </ResizablePanel>

      <ResizableHandle className="bg-transparent data-[separator='hover']:bg-muted-foreground data-[separator='active']:bg-primary/50 transition-all duration-200 data-[separator='hover']:scale-x-[3] focus-visible:ring-0 focus-visible:ring-offset-0" />

      <ResizablePanel>
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
