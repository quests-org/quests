import type { ProjectSubdomain } from "@quests/workspace/client";

import { StopIcon } from "@/client/components/stop-icon";
import { Button } from "@/client/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useAppState } from "@/client/hooks/use-app-state";
import { ArrowUpRight, Trash2 } from "lucide-react";

export function ProjectActionsCell({
  onDelete,
  onOpenInNewTab,
  onStop,
  subdomain,
}: {
  onDelete: (subdomain: ProjectSubdomain) => void;
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
  onStop: (subdomain: ProjectSubdomain) => void;
  subdomain: ProjectSubdomain;
}) {
  const { data: appState } = useAppState({ subdomain });
  const sessionActors = appState?.sessionActors ?? [];
  const isRunning = sessionActors.some((actor) =>
    actor.tags.includes("agent.alive"),
  );

  return (
    <div className="flex items-center gap-x-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={(e) => {
              e.preventDefault();
              onOpenInNewTab(subdomain);
            }}
            size="icon"
            variant="ghost"
          >
            <ArrowUpRight className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Open in new tab</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            disabled={!isRunning}
            onClick={(e) => {
              e.preventDefault();
              onStop(subdomain);
            }}
            size="icon"
            variant="ghost"
          >
            <StopIcon className="size-4 stroke-2" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isRunning ? "Stop" : "No running agents"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={(e) => {
              e.preventDefault();
              onDelete(subdomain);
            }}
            size="icon"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  );
}
