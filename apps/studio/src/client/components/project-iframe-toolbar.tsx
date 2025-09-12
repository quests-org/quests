import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { ExternalLinkIcon } from "lucide-react";

import { rpcClient } from "../rpc/client";
import { AppToolbar } from "./app-toolbar";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ProjectIFrameToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  project: WorkspaceAppProject;
}

export function ProjectIFrameToolbar({
  iframeRef,
  project,
}: ProjectIFrameToolbarProps) {
  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const handleOpenExternalClick = () => {
    openExternalLinkMutation.mutate({ url: project.urls.localhost });
  };

  const centerActions = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="ml-1 size-6"
            onClick={handleOpenExternalClick}
            size="icon"
            variant="ghost"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Open in external browser</p>
        </TooltipContent>
      </Tooltip>
    </>
  );

  return (
    <AppToolbar
      app={project}
      centerActions={centerActions}
      iframeRef={iframeRef}
    />
  );
}
