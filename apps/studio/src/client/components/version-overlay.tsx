import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
  VersionSubdomainSchema,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import ColorHash from "color-hash";
import { ExternalLinkIcon } from "lucide-react";
import { useMemo, useRef } from "react";

import { rpcClient } from "../rpc/client";
import { AppIFrame } from "./app-iframe";
import { AppToolbar } from "./app-toolbar";
import { GitCommitCard } from "./git-commit-card";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface VersionOverlayProps {
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
}

export function VersionOverlay({
  projectSubdomain,
  versionRef,
}: VersionOverlayProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const versionSubdomain = VersionSubdomainSchema.parse(
    `version-${versionRef}.${projectSubdomain}`,
  );

  const hashColor = useMemo(() => {
    const colorHash = new ColorHash();
    return colorHash.hex(versionRef);
  }, [versionRef]);

  const { data: app, isLoading } = useQuery(
    rpcClient.workspace.app.bySubdomain.queryOptions({
      input: { subdomain: versionSubdomain },
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

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const handleOpenExternalClick = () => {
    if (app) {
      openExternalLinkMutation.mutate({ url: app.urls.localhost });
    }
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="text-center space-y-6 px-6 py-8 bg-background/90 rounded-lg border shadow-lg">
          <div className="flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">Loading version...</p>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="text-center space-y-6 px-6 py-8 bg-background/90 rounded-lg border shadow-lg">
          <p className="text-sm text-muted-foreground">Version not found</p>
          <Link
            className="text-sm text-primary hover:underline"
            from="/projects/$subdomain"
            params={{
              subdomain: ProjectSubdomainSchema.parse(projectSubdomain),
            }}
            search={(prev) => ({ ...prev, selectedVersion: undefined })}
          >
            Close
          </Link>
        </div>
      </div>
    );
  }

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

  const centerContent = (
    <div className="flex-1 flex items-center justify-center min-w-0">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="text-xs file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-8 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive text-center items-center justify-center whitespace-nowrap overflow-hidden cursor-pointer font-medium"
              style={{
                backgroundColor: `${hashColor}20`,
                borderColor: `${hashColor}50`,
              }}
            >
              <span className="text-ellipsis min-w-0">
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
            className="min-w-xs max-w-md p-0 bg-background text-foreground border border-border"
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
      </TooltipProvider>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col">
      <AppToolbar
        app={app}
        centerActions={centerActions}
        centerContent={centerContent}
        iframeRef={iframeRef}
      />
      <AppIFrame
        app={app}
        className="rounded-b-lg overflow-hidden flex-1"
        iframeRef={iframeRef}
        key={app.subdomain}
      />
    </div>
  );
}
