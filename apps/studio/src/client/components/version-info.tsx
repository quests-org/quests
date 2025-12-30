import { cleanFilePath } from "@/client/lib/file-utils";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import ColorHash from "color-hash";
import { GitCommitVertical } from "lucide-react";
import { useMemo, useState } from "react";

import { rpcClient } from "../rpc/client";
import { Badge } from "./ui/badge";

interface VersionCommitMessageProps {
  projectSubdomain: ProjectSubdomain;
  showFullMessage?: boolean;
  versionRef: string;
}

interface VersionFileChangesProps {
  maxFiles?: number;
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
}

interface VersionHeaderProps {
  isCurrentVersion?: boolean;
  versionRef: string;
}

interface VersionRefProps {
  className?: string;
  iconSize?: "md" | "sm";
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
}

interface VersionRestoredFooterProps {
  projectSubdomain: ProjectSubdomain;
  restoredFromRef: string;
}

export function VersionCommitMessage({
  projectSubdomain,
  showFullMessage = false,
  versionRef,
}: VersionCommitMessageProps) {
  const { data: gitRefInfo, isLoading } = useQuery(
    rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
  );

  if (isLoading) {
    return <div className="h-5 w-48 animate-pulse rounded bg-muted" />;
  }

  if (!gitRefInfo?.commitMessage) {
    return (
      <span className="text-sm text-muted-foreground italic">
        No commit message
      </span>
    );
  }

  return (
    <div
      className={`text-sm font-medium text-wrap text-foreground ${showFullMessage ? "" : "line-clamp-2"}`}
    >
      {gitRefInfo.commitMessage}
    </div>
  );
}

export function VersionFileChanges({
  maxFiles = 3,
  projectSubdomain,
  versionRef,
}: VersionFileChangesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: gitRefInfo, isLoading } = useQuery(
    rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-1">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!gitRefInfo || gitRefInfo.files.length === 0) {
    return null;
  }

  const filesToShow = isExpanded
    ? gitRefInfo.files
    : gitRefInfo.files.slice(0, maxFiles);
  const hasMoreFiles = gitRefInfo.files.length > maxFiles;

  return (
    <div className="flex w-full flex-col gap-1">
      {filesToShow.map((file) => (
        <div
          className="flex w-full items-center gap-2 text-xs text-muted-foreground"
          key={file.filename}
        >
          <span className="flex-1 truncate font-mono">
            {cleanFilePath(file.filename)}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            {file.additions > 0 && (
              <span className="text-muted-foreground">+{file.additions}</span>
            )}
            {file.deletions > 0 && (
              <span className="text-muted-foreground">-{file.deletions}</span>
            )}
          </div>
        </div>
      ))}

      {hasMoreFiles && (
        <button
          className="mt-1 cursor-pointer text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded
            ? `Show less`
            : `Show ${gitRefInfo.files.length - maxFiles} more file${gitRefInfo.files.length - maxFiles === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}

export function VersionHeader({
  isCurrentVersion = false,
  versionRef,
}: VersionHeaderProps) {
  const hashColor = useMemo(() => {
    const colorHash = new ColorHash();
    return colorHash.hex(versionRef);
  }, [versionRef]);

  return (
    <div className="flex items-center gap-1.5">
      <GitCommitVertical
        className="-ms-1 -me-1 size-4.5 shrink-0"
        style={{ color: hashColor }}
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Version</span>
        {isCurrentVersion && (
          <Badge className="px-2 py-0 text-xs" variant="outline">
            Latest
          </Badge>
        )}
      </div>
    </div>
  );
}

export function VersionRef({
  className = "",
  iconSize = "sm",
  projectSubdomain,
  versionRef,
}: VersionRefProps) {
  const hashColor = useMemo(() => {
    const colorHash = new ColorHash();
    return colorHash.hex(versionRef);
  }, [versionRef]);

  const { data: gitRefInfo, isLoading } = useQuery(
    rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
  );

  const iconSizeClass = iconSize === "sm" ? "h-4 w-4" : "h-5 w-5";

  if (isLoading) {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <GitCommitVertical
          className={`${iconSizeClass} -me-1 shrink-0`}
          style={{ color: hashColor }}
        />
        <span className="shrink-0 text-xs text-muted-foreground">Version</span>
        <span className="h-3 w-24 animate-pulse rounded bg-muted" />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <GitCommitVertical
        className={`${iconSizeClass} -me-1 shrink-0`}
        style={{ color: hashColor }}
      />
      <span className="shrink-0 text-xs text-muted-foreground">Version</span>
      <span className="line-clamp-1 min-w-0 text-xs">
        {gitRefInfo?.commitMessage || "No commit message"}
      </span>
    </span>
  );
}

export function VersionRestoredFooter({
  projectSubdomain,
  restoredFromRef,
}: VersionRestoredFooterProps) {
  return (
    <div className="border-t border-border pt-2">
      <div className="flex items-center gap-1">
        <span className="shrink-0 text-xs text-muted-foreground">
          Restored from{" "}
        </span>
        <VersionRef
          projectSubdomain={projectSubdomain}
          versionRef={restoredFromRef}
        />
      </div>
    </div>
  );
}
