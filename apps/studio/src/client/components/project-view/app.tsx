import { AppView } from "@/client/components/app-view";
import { ProjectSidebar } from "@/client/components/project-sidebar";
import { VersionOverlay } from "@/client/components/version-overlay";
import { cn } from "@/client/lib/utils";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";

export function ProjectViewApp({
  project,
  selectedModelURI,
  selectedVersion,
  sidebarCollapsed,
}: {
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedVersion: string | undefined;
  sidebarCollapsed: boolean;
}) {
  return (
    <>
      <ProjectSidebar
        collapsed={sidebarCollapsed}
        project={project}
        selectedModelURI={selectedModelURI}
        selectedVersion={selectedVersion}
      />

      <div
        className={cn(
          "flex-1 flex flex-col p-2 bg-secondary border-t overflow-hidden",
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
    </>
  );
}
