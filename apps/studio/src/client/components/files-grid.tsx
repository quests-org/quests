import {
  openProjectFileViewerAtom,
  type ProjectFileViewerFile,
} from "@/client/atoms/project-file-viewer";
import { cn } from "@/client/lib/utils";
import { useSetAtom } from "jotai";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { FilePreviewCard } from "./file-preview-card";
import { FilePreviewListItem } from "./file-preview-list-item";
import { Button } from "./ui/button";

interface FilesGridProps {
  alignEnd?: boolean;
  files: ProjectFileViewerFile[];
  initialVisibleCount?: number;
}

const DEFAULT_INITIAL_VISIBLE_COUNT = 6;

export function FilesGrid({
  alignEnd = false,
  files,
  initialVisibleCount = DEFAULT_INITIAL_VISIBLE_COUNT,
}: FilesGridProps) {
  const openFileViewer = useSetAtom(openProjectFileViewerAtom);
  const [isExpanded, setIsExpanded] = useState(false);

  const allFiles: ProjectFileViewerFile[] = files.map((f) => ({
    filename: f.filename,
    filePath: f.filePath,
    mimeType: f.mimeType,
    projectSubdomain: f.projectSubdomain,
    url: f.url,
    versionRef: f.versionRef,
  }));

  const handleFileClick = (file: ProjectFileViewerFile) => {
    const currentIndex = allFiles.findIndex((f) => f.url === file.url);
    openFileViewer({
      currentIndex: currentIndex === -1 ? 0 : currentIndex,
      files: allFiles,
    });
  };

  const visibleFiles = files.slice(0, initialVisibleCount);
  const hiddenFiles = files.slice(initialVisibleCount);
  const hasHiddenFiles = hiddenFiles.length > 0;
  const filesToShow = isExpanded ? files : visibleFiles;

  const richPreviewFiles: (ProjectFileViewerFile & {
    shouldSpanTwo?: boolean;
  })[] = [];
  const otherFiles: ProjectFileViewerFile[] = [];

  for (const file of filesToShow) {
    const isImage = file.mimeType.startsWith("image/");
    const isHtml = file.mimeType === "text/html";
    const isPdf = file.mimeType === "application/pdf";
    const isVideo = file.mimeType.startsWith("video/");
    const isMarkdown = file.mimeType === "text/markdown";

    if (isImage || isHtml || isPdf || isVideo || isMarkdown) {
      richPreviewFiles.push({
        ...file,
        shouldSpanTwo: isMarkdown,
      });
    } else {
      otherFiles.push(file);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {richPreviewFiles.length > 0 && (
        <div className="@container">
          <div
            className={cn("flex flex-wrap gap-2", alignEnd && "justify-end")}
          >
            {richPreviewFiles.map((file) => (
              <div
                className={cn(
                  "w-full shrink-0 grow-0 @md:w-[calc((100%/2)-(0.5rem/2))]",
                  file.shouldSpanTwo
                    ? "@2xl:w-[calc((100%/3*2)-(0.5rem/3))]"
                    : "@2xl:w-[calc((100%/3)-(0.5rem*2/3))]",
                )}
                key={file.filePath}
              >
                <FilePreviewCard
                  file={file}
                  onClick={() => {
                    handleFileClick(file);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {otherFiles.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-start gap-2",
            alignEnd && "justify-end",
          )}
        >
          {otherFiles.map((file) => (
            <div className="h-12 min-w-0" key={file.filePath}>
              <FilePreviewListItem
                file={file}
                onClick={() => {
                  handleFileClick(file);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {hasHiddenFiles && (
        <div className={cn("flex", alignEnd ? "justify-end" : "justify-start")}>
          <Button
            onClick={() => {
              setIsExpanded(!isExpanded);
            }}
            size="sm"
            type="button"
            variant="outline-muted"
          >
            <span className="text-xs">
              {isExpanded ? "Show less" : `+${hiddenFiles.length} more`}
            </span>
            {isExpanded ? (
              <ChevronUp className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
