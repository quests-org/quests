import { getAssetUrl } from "@/client/lib/get-asset-url";
import { cn } from "@/client/lib/utils";
import { PROJECT_CONFIG_FILE_NAME } from "@quests/shared";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { rpcClient } from "../rpc/client";
import { type FileItem, FilesGrid } from "./files-grid";
import {
  VersionCommitMessage,
  VersionFileChanges,
  VersionHeader,
  VersionRestoredFooter,
} from "./version-info";
import { ViewIndicator } from "./view-indicator";

interface VersionCardProps {
  assetBaseUrl: string;
  isLastGitCommit?: boolean;
  isSelected?: boolean;
  projectSubdomain: ProjectSubdomain;
  restoredFromRef?: string;
  versionRef: string;
}

export function VersionAndFilesCard({
  assetBaseUrl,
  isLastGitCommit = false,
  isSelected = false,
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

  const fileItems: FileItem[] = useMemo(() => {
    return filesOutsideSrc.map((file) => ({
      filename: file.filename,
      filePath: file.filePath,
      mimeType: file.mimeType,
      previewUrl: getAssetUrl({
        assetBase: assetBaseUrl,
        filePath: file.filePath,
        versionRef,
      }),
      projectSubdomain,
      versionRef,
    }));
  }, [filesOutsideSrc, assetBaseUrl, versionRef, projectSubdomain]);

  const hasFilesInSrc = filesInSrc.length > 0;
  const hasFilesOutsideSrc = fileItems.length > 0;

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!hasFilesInSrc && !hasFilesOutsideSrc) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {hasFilesInSrc && (
        <div
          className={cn(
            "flex flex-col gap-6 overflow-hidden rounded-lg border bg-card py-0 text-card-foreground shadow-sm",
            "relative p-3 transition-colors",
            isSelected
              ? "border-secondary-foreground hover:bg-muted/30"
              : "hover:bg-muted/50",
          )}
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
        </div>
      )}

      {hasFilesOutsideSrc && <FilesGrid files={fileItems} />}
    </div>
  );
}

function shouldFilterFile(filename: string): boolean {
  const baseName = filename.split("/").pop()?.toLowerCase() ?? "";

  const filteredFiles = [
    PROJECT_CONFIG_FILE_NAME,
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ];

  if (filteredFiles.some((filtered) => baseName === filtered.toLowerCase())) {
    return true;
  }

  return false;
}
