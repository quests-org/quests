import { filenameFromFilePath } from "@/client/lib/file-utils";
import { getAssetUrl } from "@/client/lib/get-asset-url";
import { cn } from "@/client/lib/utils";
import { PROJECT_MANIFEST_FILE_NAME } from "@quests/shared";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { type ProjectFileViewerFile } from "../atoms/project-file-viewer";
import { rpcClient } from "../rpc/client";
import { FilesGrid } from "./files-grid";
import {
  VersionCommitMessage,
  VersionFileChanges,
  VersionHeader,
  VersionRestoredFooter,
} from "./version-info";
import { ViewIndicator } from "./view-indicator";

interface VersionCardProps {
  assetBaseUrl: string;
  className?: string;
  isLastGitCommit?: boolean;
  isSelected?: boolean;
  onVersionClick?: () => void;
  projectSubdomain: ProjectSubdomain;
  restoredFromRef?: string;
  versionRef: string;
}

export function VersionAndFilesCard({
  assetBaseUrl,
  className,
  isLastGitCommit = false,
  isSelected = false,
  onVersionClick,
  projectSubdomain,
  restoredFromRef,
  versionRef,
}: VersionCardProps) {
  const { data: gitRefInfo, isLoading } = useQuery(
    rpcClient.workspace.project.git.ref.queryOptions({
      input: {
        gitRef: versionRef,
        projectSubdomain,
      },
    }),
  );

  const { filesInSrc, filesOutsideSrc } = useMemo(() => {
    if (!gitRefInfo?.files) {
      return { filesInSrc: [], filesOutsideSrc: [] };
    }

    const inSrc: typeof gitRefInfo.files = [];
    const outsideSrc: typeof gitRefInfo.files = [];

    for (const file of gitRefInfo.files) {
      if (file.status === "deleted" || shouldFilterFile(file.filePath)) {
        continue;
      }

      if (file.filePath.startsWith("src/")) {
        inSrc.push(file);
      } else {
        outsideSrc.push(file);
      }
    }

    return { filesInSrc: inSrc, filesOutsideSrc: outsideSrc };
  }, [gitRefInfo]);

  const fileItems: ProjectFileViewerFile[] = useMemo(() => {
    return filesOutsideSrc.map((file) => ({
      filename: file.filename,
      filePath: file.filePath,
      mimeType: file.mimeType,
      projectSubdomain,
      url: getAssetUrl({
        assetBase: assetBaseUrl,
        filePath: file.filePath,
        versionRef,
      }),
      versionRef,
    }));
  }, [filesOutsideSrc, assetBaseUrl, versionRef, projectSubdomain]);

  const hasFilesInSrc = filesInSrc.length > 0;
  const hasFilesOutsideSrc = fileItems.length > 0;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex w-full flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm",
          className,
        )}
      >
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!hasFilesInSrc && !hasFilesOutsideSrc) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {hasFilesInSrc && (
        <button
          className={cn(
            "flex flex-col gap-6 overflow-hidden rounded-lg border bg-card py-0 text-card-foreground shadow-sm",
            "relative p-3 text-left transition-colors",
            isSelected
              ? "border-secondary-foreground hover:bg-muted/30"
              : "hover:bg-muted/50",
          )}
          disabled={!onVersionClick}
          onClick={onVersionClick}
          type="button"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <VersionHeader
                isCurrentVersion={isLastGitCommit}
                versionRef={versionRef}
              />
              <ViewIndicator isSelected={isSelected} />
            </div>

            <VersionCommitMessage
              projectSubdomain={projectSubdomain}
              showFullMessage={false}
              versionRef={versionRef}
            />

            <VersionFileChanges
              assetBaseUrl={assetBaseUrl}
              projectSubdomain={projectSubdomain}
              versionRef={versionRef}
            />

            {restoredFromRef && (
              <VersionRestoredFooter
                projectSubdomain={projectSubdomain}
                restoredFromRef={restoredFromRef}
              />
            )}
          </div>
        </button>
      )}

      {hasFilesOutsideSrc && <FilesGrid files={fileItems} />}
    </div>
  );
}

function shouldFilterFile(filename: string): boolean {
  const baseName = filenameFromFilePath(filename).toLowerCase();

  const filteredFiles = [
    PROJECT_MANIFEST_FILE_NAME,
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ];

  if (filteredFiles.some((filtered) => baseName === filtered.toLowerCase())) {
    return true;
  }

  return false;
}
