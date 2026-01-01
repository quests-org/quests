import { type FileViewerFile } from "@/client/atoms/file-viewer";
import { getAssetUrl } from "@/client/lib/asset-utils";
import { cn } from "@/client/lib/utils";
import { PROJECT_CONFIG_FILE_NAME } from "@quests/shared";
import { type ProjectSubdomain, type StoreId } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { rpcClient } from "../rpc/client";
import { AttachmentItem } from "./attachment-item";
import {
  VersionCommitMessage,
  VersionFileChanges,
  VersionHeader,
  VersionRestoredFooter,
} from "./version-info";
import { ViewIndicator } from "./view-indicator";

interface VersionCardProps {
  assetBaseURL: string;
  isLastGitCommit?: boolean;
  isSelected?: boolean;
  messageId: StoreId.Message;
  projectSubdomain: ProjectSubdomain;
  restoredFromRef?: string;
  versionRef: string;
}

export function VersionAndFilesCard({
  assetBaseURL,
  isLastGitCommit = false,
  isSelected = false,
  messageId,
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

  const { imageFiles, otherFiles } = useMemo(() => {
    const images: typeof filesOutsideSrc = [];
    const others: typeof filesOutsideSrc = [];

    for (const file of filesOutsideSrc) {
      if (file.mimeType.startsWith("image/")) {
        images.push(file);
      } else {
        others.push(file);
      }
    }

    return { imageFiles: images, otherFiles: others };
  }, [filesOutsideSrc]);

  const hasFilesInSrc = filesInSrc.length > 0;
  const hasImages = imageFiles.length > 0;
  const hasOtherFiles = otherFiles.length > 0;

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!hasFilesInSrc && !hasImages && !hasOtherFiles) {
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
              assetBaseURL={assetBaseURL}
              messageId={messageId}
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

      {hasImages && (
        <div className="grid grid-cols-2 gap-2">
          {imageFiles.map((file) => {
            const assetUrl = getAssetUrl({
              assetBase: assetBaseURL,
              filePath: file.filePath,
              messageId,
            });
            const gallery: FileViewerFile[] = imageFiles.map((f) => ({
              filename: f.filename,
              filePath: f.filePath,
              mimeType: f.mimeType,
              size: 0,
              url: getAssetUrl({
                assetBase: assetBaseURL,
                filePath: f.filePath,
                messageId,
              }),
            }));

            return (
              <AttachmentItem
                filename={file.filename}
                filePath={file.filePath}
                gallery={gallery}
                imageClassName="h-auto w-full"
                key={file.filePath}
                mimeType={file.mimeType}
                previewUrl={assetUrl}
              />
            );
          })}
        </div>
      )}

      {hasOtherFiles && (
        <div className="flex flex-wrap items-start gap-2">
          {otherFiles.map((file) => {
            const assetUrl = getAssetUrl({
              assetBase: assetBaseURL,
              filePath: file.filePath,
              messageId,
            });
            const gallery: FileViewerFile[] = otherFiles.map((f) => ({
              filename: f.filename,
              filePath: f.filePath,
              mimeType: f.mimeType,
              size: 0,
              url: getAssetUrl({
                assetBase: assetBaseURL,
                filePath: f.filePath,
                messageId,
              }),
            }));

            return (
              <AttachmentItem
                filename={file.filename}
                filePath={file.filePath}
                gallery={gallery}
                key={file.filePath}
                mimeType={file.mimeType}
                previewUrl={assetUrl}
              />
            );
          })}
        </div>
      )}
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
