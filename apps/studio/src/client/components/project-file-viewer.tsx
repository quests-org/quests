import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { downloadFile, isFileDownloadable } from "@/client/lib/file-actions";
import { getFileType } from "@/client/lib/get-file-type";
import { cn } from "@/client/lib/utils";
import { Maximize2, X } from "lucide-react";

import { FileActionsMenu } from "./file-actions-menu";
import { FileIcon } from "./file-icon";
import { FilePreviewFallback } from "./file-preview-fallback";
import { FileVersionBadge } from "./file-version-badge";
import { FileViewer } from "./file-viewer";
import { ImageWithFallback } from "./image-with-fallback";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ProjectFileViewer({
  file,
  fullSize,
  isInPanel,
  onClose,
  onExpand,
}: {
  file: ProjectFileViewerFile;
  fullSize?: boolean;
  isInPanel?: boolean;
  onClose: () => void;
  onExpand?: () => void;
}) {
  const isDownloadable = isFileDownloadable(file.url);
  const fileType = getFileType(file);
  const isImage = fileType === "image";
  const isVideo = fileType === "video";
  const isMediaFile = isImage || isVideo;

  const handleDownload = async () => {
    await downloadFile(file);
  };

  return (
    <div
      className={cn(
        "relative flex size-full flex-col",
        isInPanel && isMediaFile && "rounded-lg bg-black p-4",
      )}
    >
      {isMediaFile && (
        <div className="dark absolute top-4 right-4 left-4 z-10 grid [grid-template-columns:1fr_auto_1fr] items-center text-foreground">
          <div />
          <div className="flex min-w-0 items-center gap-2">
            <FileIcon
              className="size-4 shrink-0"
              filename={file.filename}
              mimeType={file.mimeType}
            />
            <span className="truncate text-xs">{file.filePath}</span>
            <FileVersionBadge
              filePath={file.filePath}
              projectSubdomain={file.projectSubdomain}
              versionRef={file.versionRef}
            />
          </div>
          <div className="flex items-center justify-end gap-1">
            {file.projectSubdomain && file.filePath && (
              <FileActionsMenu file={file} variant="ghost-overlay" />
            )}
            {onExpand && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={onExpand} size="sm" variant="ghost">
                    <Maximize2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expand</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex size-full items-center justify-center",
          isMediaFile && !isInPanel && "pt-10",
        )}
      >
        {isImage ? (
          <ImageWithFallback
            alt={file.filename}
            className="size-auto max-h-full max-w-full object-contain select-none"
            fallback={
              <FilePreviewFallback
                fallbackExtension="jpg"
                filename={file.filename}
                onDownload={isDownloadable ? handleDownload : undefined}
              />
            }
            fallbackClassName="size-32 rounded-lg"
            filename={file.filename}
            onClick={onClose}
            showCheckerboard
            src={file.url}
          />
        ) : isVideo ? (
          <video
            autoPlay
            className="size-full bg-black/50 object-contain dark:bg-white/10"
            controls
            // cspell:ignore nofullscreen
            controlsList="nofullscreen"
            key={file.url}
            src={file.url}
          />
        ) : (
          <FileViewer
            file={file}
            fullSize={fullSize}
            onClose={onClose}
            onExpand={onExpand}
          />
        )}
      </div>
    </div>
  );
}
