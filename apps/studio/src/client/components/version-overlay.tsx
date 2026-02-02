import {
  type ProjectSubdomain,
  VersionSubdomainSchema,
} from "@quests/workspace/client";
import { skipToken, useQuery } from "@tanstack/react-query";
import ColorHash from "color-hash";
import { useMemo } from "react";

import { rpcClient } from "../rpc/client";
import { AppView } from "./app-view";
import { GitCommitCard } from "./git-commit-card";
import { InternalLink } from "./internal-link";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface VersionOverlayProps {
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
}

export function VersionOverlay({
  projectSubdomain,
  versionRef,
}: VersionOverlayProps) {
  const versionSubdomainResult = VersionSubdomainSchema.safeParse(
    `version-${versionRef}.${projectSubdomain}`,
  );

  const hashColor = useMemo(() => {
    const colorHash = new ColorHash();
    return colorHash.hex(versionRef);
  }, [versionRef]);

  const { data: app, isLoading } = useQuery(
    rpcClient.workspace.app.bySubdomain.queryOptions({
      input: versionSubdomainResult.success
        ? { subdomain: versionSubdomainResult.data }
        : skipToken,
    }),
  );

  const { data: gitRefInfo } = useQuery({
    ...rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
    enabled: !!versionRef,
  });

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="space-y-6 rounded-lg border bg-background/90 px-6 py-8 text-center shadow-lg">
          <div className="flex items-center justify-center">
            <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">Loading version...</p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="space-y-6 rounded-lg border bg-background/90 px-6 py-8 text-center shadow-lg">
          <p className="text-sm text-muted-foreground">Version not found</p>
          <InternalLink
            allowOpenNewTab={false}
            className="text-sm text-primary hover:underline"
            from="/projects/$subdomain"
            params={{
              subdomain: projectSubdomain,
            }}
            search={(prev) => ({ ...prev, selectedVersion: undefined })}
          >
            Close
          </InternalLink>
        </div>
      </div>
    );
  }

  const centerContent = (
    <div className="flex min-w-0 flex-1 items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex h-8 w-full min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-input bg-transparent px-3 py-1 text-center text-xs font-medium whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-xs dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
            style={{
              backgroundColor: `${hashColor}20`,
              borderColor: `${hashColor}50`,
            }}
          >
            <span className="min-w-0 text-ellipsis">
              Viewing Version{" "}
              <span className="font-mono font-semibold">
                {versionRef.slice(0, 8)}
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
          className="max-w-md min-w-xs border border-border bg-background p-0 text-foreground"
          side="bottom"
        >
          <GitCommitCard
            disableBorder
            disableLink
            isLastGitCommit={false}
            isSelected={false}
            projectSubdomain={projectSubdomain}
            showCommitMessage
            showFullCommitMessage
            versionRef={versionRef}
          />
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <AppView
      app={app}
      centerContent={centerContent}
      className="absolute inset-0"
    />
  );
}
