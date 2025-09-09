import { AppLink } from "@/client/components/app-link";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import ColorHash from "color-hash";
import { Maximize2 } from "lucide-react";
import { useMemo } from "react";

import { rpcClient } from "../rpc/client";
import { AppToolbar } from "./app-toolbar";
import { GitCommitCard } from "./git-commit-card";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ProjectToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  project: WorkspaceAppProject;
  selectedVersion?: string;
  subdomain: ProjectSubdomain;
}

export function ProjectToolbar({
  iframeRef,
  project,
  selectedVersion,
  subdomain,
}: ProjectToolbarProps) {
  const hashColor = useMemo(() => {
    if (!selectedVersion) {
      return;
    }
    const colorHash = new ColorHash();
    return colorHash.hex(selectedVersion);
  }, [selectedVersion]);

  const { data: gitRefInfo } = useQuery({
    ...rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: selectedVersion ?? "",
        projectSubdomain: subdomain,
      },
    }),
    enabled: !!selectedVersion,
  });

  const centerActions = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          {selectedVersion ? (
            <Button disabled size="icon" variant="ghost">
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : (
            <AppLink params={{ subdomain }} to="/projects/$subdomain/view">
              <Button size="icon" variant="ghost">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </AppLink>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p>Full screen</p>
        </TooltipContent>
      </Tooltip>
    </>
  );

  const rightActions = null;

  const centerContent = selectedVersion ? (
    <div className="flex-1 flex items-center justify-center min-w-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive text-center items-center justify-center whitespace-nowrap overflow-hidden cursor-pointer"
              style={{
                backgroundColor: `${hashColor ?? ""}20`,
                borderColor: `${hashColor ?? ""}50`,
              }}
            >
              <span className="text-ellipsis min-w-0">
                Viewing Version{" "}
                <span className="font-mono font-semibold">
                  {selectedVersion.slice(0, 8)}
                </span>
                {gitRefInfo?.commitMessage && (
                  <>
                    :{" "}
                    {gitRefInfo.commitMessage.length > 50
                      ? `${gitRefInfo.commitMessage.slice(0, 50)}...`
                      : gitRefInfo.commitMessage}
                  </>
                )}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            arrowClassName="bg-background fill-background border-b border-r border-border"
            className="max-w-md p-0 bg-background text-foreground border border-border"
            side="bottom"
          >
            <GitCommitCard
              disableBorder
              disableLink
              isLastGitCommit={false}
              isSelected={false}
              projectSubdomain={subdomain}
              showCommitMessage
              showFullCommitMessage
              versionRef={selectedVersion}
            />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  ) : undefined;

  return (
    <AppToolbar
      app={project}
      centerActions={centerActions}
      centerContent={centerContent}
      iframeRef={iframeRef}
      rightActions={rightActions}
    />
  );
}
