import {
  openProjectFileViewerAtom,
  type ProjectFileViewerFile,
} from "@/client/atoms/project-file-viewer";
import { getFileType, isReadableText } from "@/client/lib/get-file-type";
import { cn } from "@/client/lib/utils";
import { APP_FOLDER_NAMES } from "@quests/workspace/client";
import { type SessionMessageDataPart } from "@quests/workspace/client";
import { useSetAtom } from "jotai";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fork } from "radashi";
import { useState } from "react";

import { FilePreviewCard } from "./file-preview-card";
import { FilePreviewListItem } from "./file-preview-list-item";
import { FolderPreviewListItem } from "./folder-preview-list-item";
import { Button } from "./ui/button";

interface FilesGridProps {
  alignEnd?: boolean;
  compact?: boolean;
  files: ProjectFileViewerFile[];
  folders?: SessionMessageDataPart.FolderAttachmentDataPart[];
  initialVisibleCount?: number;
}

const DEFAULT_INITIAL_VISIBLE_COUNT = 6;

export function FilesGrid({
  alignEnd = false,
  compact = false,
  files,
  folders = [],
  initialVisibleCount = DEFAULT_INITIAL_VISIBLE_COUNT,
}: FilesGridProps) {
  const openFileViewer = useSetAtom(openProjectFileViewerAtom);
  const [isExpanded, setIsExpanded] = useState(false);

  const [richFiles, nonRichFiles] = fork(files, hasRichPreview);

  // Prioritize output folder files within rich files
  const [outputRichFiles, otherRichFiles] = fork(richFiles, isOutputFile);
  const sortedRichFiles = [...outputRichFiles, ...otherRichFiles];

  const sortedFiles = [...sortedRichFiles, ...nonRichFiles];

  const handleFileClick = (file: ProjectFileViewerFile) => {
    const currentIndex = sortedFiles.findIndex((f) => f.url === file.url);
    openFileViewer({
      currentIndex: currentIndex === -1 ? 0 : currentIndex,
      files: sortedFiles,
    });
  };

  const visibleFiles = sortedFiles.slice(0, initialVisibleCount);
  const hiddenFiles = sortedFiles.slice(initialVisibleCount);
  const hasHiddenFiles = hiddenFiles.length > 0;
  const filesToShow = isExpanded ? sortedFiles : visibleFiles;

  const richPreviewFiles = filesToShow.filter(hasRichPreview);
  const otherFiles = filesToShow.filter((file) => !hasRichPreview(file));

  const isSingleRichFile = !compact && richPreviewFiles.length === 1;

  return (
    <div className="flex flex-col gap-2">
      {richPreviewFiles.length > 0 && (
        <div className="@container">
          <div
            className={cn("flex flex-wrap gap-2", alignEnd && "justify-end")}
          >
            {richPreviewFiles.map((file) => {
              const shouldSpanTwoThirds =
                !compact && (isSingleRichFile || isReadableText(file));

              return (
                <div
                  className={cn(
                    "w-full shrink-0 grow-0",
                    isSingleRichFile
                      ? "@md:w-[calc((100%/3*2)-(0.5rem/3))]"
                      : "@md:w-[calc((100%/2)-(0.5rem/2))]",
                    shouldSpanTwoThirds
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
              );
            })}
          </div>
        </div>
      )}

      {(otherFiles.length > 0 || folders.length > 0) && (
        <div
          className={cn(
            "flex flex-wrap items-start gap-2",
            alignEnd && "justify-end",
          )}
        >
          {folders.map((folder) => (
            <div className="h-12 min-w-0" key={folder.id}>
              <FolderPreviewListItem folder={folder} />
            </div>
          ))}
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

function hasRichPreview(file: ProjectFileViewerFile) {
  const fileType = getFileType(file);
  return (
    fileType === "image" ||
    fileType === "html" ||
    fileType === "pdf" ||
    fileType === "video" ||
    fileType === "markdown" ||
    fileType === "text"
  );
}

function isOutputFile(file: ProjectFileViewerFile) {
  return file.filePath.startsWith(`${APP_FOLDER_NAMES.output}/`);
}
