import { useAppState } from "@/client/hooks/use-app-state";
import { cn } from "@/client/lib/utils";
import { QuestsLogoIcon } from "@quests/components/logo";
import { GIT_AUTHOR, type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import ColorHash from "color-hash";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { rpcClient } from "../rpc/client";
import { InternalLink } from "./internal-link";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ViewIndicator } from "./view-indicator";

export function VersionList({
  projectSubdomain,
  selectedVersion,
}: {
  projectSubdomain: ProjectSubdomain;
  selectedVersion?: string;
}) {
  const [, forceUpdate] = useState({});

  const {
    data: commitsData,
    error,
    isLoading,
  } = useQuery(
    rpcClient.workspace.project.git.commits.live.list.experimental_liveOptions({
      input: { projectSubdomain },
    }),
  );

  const { data: appState } = useAppState({
    subdomain: projectSubdomain,
  });

  const isAgentRunning = (appState?.sessionActors ?? []).some((session) =>
    session.tags.includes("agent.running"),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({});
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-muted-foreground">
          Failed to load versions: {error.message}
        </div>
      </div>
    );
  }

  if (!commitsData?.commits || commitsData.commits.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-muted-foreground">
          No versions found
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {isAgentRunning && <InProgressVersionCard />}
      {commitsData.commits.map((commit, index) => {
        // Render current working copy if last version instead of ref
        const isLast = index === 0;
        const isSelected =
          selectedVersion === commit.hash || (isLast && !selectedVersion);

        const colorHash = new ColorHash();
        const hashColor = colorHash.hex(commit.hash);

        return (
          <InternalLink
            allowOpenNewTab={false}
            from="/projects/$subdomain"
            key={commit.hash}
            params={{ subdomain: projectSubdomain }}
            search={(prev) => ({
              ...prev,
              selectedVersion: isLast ? undefined : commit.hash,
            })}
          >
            <div
              className={cn(
                "group flex flex-col gap-3 rounded-lg border p-3 transition-colors",
                isSelected
                  ? "border-secondary-foreground bg-muted/30 hover:bg-muted/30"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="line-clamp-2 text-sm font-medium text-foreground">
                  {commit.message}
                </div>

                <ViewIndicator isSelected={isSelected} />
              </div>

              <div className="flex flex-wrap items-baseline gap-1 text-xs text-muted-foreground">
                <Avatar className="size-4">
                  {commit.email === GIT_AUTHOR.email ? (
                    <AvatarFallback>
                      <QuestsLogoIcon className="size-2.5" />
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarFallback className="text-[10px]">
                        {getInitials(commit.author)}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <span>{commit.author}</span>
                <span>•</span>
                <span className="font-mono" style={{ color: hashColor }}>
                  {commit.hash.slice(0, 8)}
                </span>
                <span>•</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      {formatDistanceToNow(commit.createdAt, {
                        addSuffix: true,
                      }).replace("about ", "")}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{format(commit.createdAt, "PPpp")}</p>
                  </TooltipContent>
                </Tooltip>
                {index === 0 && (
                  <>
                    <span>•</span>
                    <span>Latest</span>
                  </>
                )}
              </div>
            </div>
          </InternalLink>
        );
      })}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function InProgressVersionCard() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-muted-foreground/50 bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <div className="shiny-text text-sm font-medium text-foreground">
          Working on your changes...
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-1 text-xs text-muted-foreground">
        <Avatar className="size-4">
          <AvatarFallback>
            <QuestsLogoIcon className="size-2.5" />
          </AvatarFallback>
        </Avatar>
        <span>{GIT_AUTHOR.name}</span>
      </div>
    </div>
  );
}
