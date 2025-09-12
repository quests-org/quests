import { cn } from "@/client/lib/utils";
import { QuestsLogoIcon } from "@quests/components/logo";
import { GIT_AUTHOR, type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import ColorHash from "color-hash";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

import { rpcClient } from "../rpc/client";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ViewIndicator } from "./view-indicator";

export function VersionList({
  projectSubdomain,
  selectedVersion,
}: {
  projectSubdomain: ProjectSubdomain;
  selectedVersion?: string;
}) {
  const {
    data: commitsData,
    error,
    isLoading,
  } = useQuery(
    rpcClient.workspace.project.git.commits.live.list.experimental_liveOptions({
      input: { projectSubdomain },
    }),
  );

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
      {commitsData.commits.map((commit, index) => {
        const isLast = index === 0;
        const isSelected =
          selectedVersion === commit.hash || (isLast && !selectedVersion);
        const shouldSetVersion = !isSelected && !isLast;

        const colorHash = new ColorHash();
        const hashColor = colorHash.hex(commit.hash);

        return (
          <Link
            from="/projects/$subdomain"
            key={commit.hash}
            params={{ subdomain: projectSubdomain }}
            search={(prev) => ({
              ...prev,
              selectedVersion: shouldSetVersion ? commit.hash : undefined,
            })}
          >
            <div
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-3 transition-colors group",
                isSelected
                  ? "border-secondary-foreground bg-muted/30 hover:bg-muted/30"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium text-foreground line-clamp-2">
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
                <span>
                  {formatDistanceToNow(commit.createdAt, {
                    addSuffix: true,
                  }).replace("about ", "")}
                </span>
              </div>
            </div>
          </Link>
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
