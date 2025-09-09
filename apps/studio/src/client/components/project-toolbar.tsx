import { AppLink } from "@/client/components/app-link";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { Maximize2 } from "lucide-react";

import { AppToolbar } from "./app-toolbar";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ProjectToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  project: WorkspaceAppProject;
  subdomain: ProjectSubdomain;
}

export function ProjectToolbar({
  iframeRef,
  project,
  subdomain,
}: ProjectToolbarProps) {
  const centerActions = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <AppLink params={{ subdomain }} to="/projects/$subdomain/view">
            <Button size="icon" variant="ghost">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </AppLink>
        </TooltipTrigger>
        <TooltipContent>
          <p>Full screen</p>
        </TooltipContent>
      </Tooltip>
    </>
  );

  const rightActions = null;

  return (
    <AppToolbar
      app={project}
      centerActions={centerActions}
      iframeRef={iframeRef}
      rightActions={rightActions}
    />
  );
}
