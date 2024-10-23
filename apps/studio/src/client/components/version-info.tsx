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
  versionRef,
}: VersionCommitMessageProps) {
  const { data: gitRefInfo } = useQuery(
    rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
  );

  if (!gitRefInfo?.commitMessage) {
    return (
      <span className="text-sm text-muted-foreground italic">
        No commit message
      </span>
    );
  }

  return (
    <span className="text-sm text-foreground font-medium line-clamp-2 block">
      {gitRefInfo.commitMessage}
    </span>
  );
}

export function VersionFileChanges({
  maxFiles = 3,
  projectSubdomain,
  versionRef,
}: VersionFileChangesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: gitRefInfo } = useQuery(
    rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
  );

  if (!gitRefInfo || gitRefInfo.files.length === 0) {
    return null;
  }

  const filesToShow = isExpanded
    ? gitRefInfo.files
    : gitRefInfo.files.slice(0, maxFiles);
  const hasMoreFiles = gitRefInfo.files.length > maxFiles;

  return (
    <div className="w-full flex flex-col gap-1">
      {filesToShow.map((file) => (
        <div
          className="flex items-center gap-2 text-xs text-muted-foreground w-full"
          key={file.filename}
        >
          <span className="truncate flex-1 font-mono">
            {cleanFilePath(file.filename)}
          </span>

          <div className="flex items-center gap-1 shrink-0">
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
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left mt-1 cursor-pointer"
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
        className="size-4.5 shrink-0 -ms-1 -me-1"
        style={{ color: hashColor }}
      />

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Version</span>
        {isCurrentVersion && (
          <Badge className="text-xs py-0 px-2" variant="outline">
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

  const { data: gitRefInfo } = useQuery(
    rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
  );

  const iconSizeClass = iconSize === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <GitCommitVertical
        className={`${iconSizeClass} shrink-0 -me-1`}
        style={{ color: hashColor }}
      />
      <span className="text-xs text-muted-foreground shrink-0">Version</span>
      <span className="text-xs min-w-0 line-clamp-1">
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
    <div className="pt-2 border-t border-border">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground shrink-0">
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
