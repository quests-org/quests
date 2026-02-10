import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { getFileType } from "@/client/lib/get-file-type";
import { cn } from "@/client/lib/utils";

import { FileIcon } from "./file-icon";
import { FileVersionBadge } from "./file-version-badge";
import { ImageWithFallback } from "./image-with-fallback";
import { PreviewListItem } from "./preview-list-item";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function FilePreviewListItem({
  file,
  isSelected = false,
  onClick,
}: {
  file: ProjectFileViewerFile;
  isSelected?: boolean;
  onClick: () => void;
}) {
  const { filename, filePath, mimeType, projectSubdomain, url, versionRef } =
    file;
  const fileType = getFileType(file);

  if (url && fileType === "image") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "size-12 shrink-0 overflow-hidden p-0",
              isSelected &&
                "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
            onClick={onClick}
            type="button"
            variant="outline"
          >
            <ImageWithFallback
              alt={filename}
              className="size-12 object-cover"
              fallbackClassName="size-12 rounded-lg"
              filename={filename}
              showCheckerboard
              src={url}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[min(500px,90vw)] wrap-break-word"
          collisionPadding={10}
        >
          <div className="flex items-center gap-x-2">
            <span>{filePath}</span>
            <FileVersionBadge
              className="shrink-0 text-[10px]"
              filePath={filePath}
              projectSubdomain={projectSubdomain}
              versionRef={versionRef}
            />
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <PreviewListItem
      icon={
        <FileIcon
          className="size-5 shrink-0 text-muted-foreground"
          filename={filename}
          mimeType={mimeType}
        />
      }
      isSelected={isSelected}
      label={filename}
      onClick={onClick}
      rightElement={
        <FileVersionBadge
          className="text-[10px]"
          filePath={filePath}
          projectSubdomain={projectSubdomain}
          versionRef={versionRef}
        />
      }
      tooltipContent={filePath}
    />
  );
}
