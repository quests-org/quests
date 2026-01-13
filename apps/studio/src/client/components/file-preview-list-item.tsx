import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { cn } from "@/client/lib/utils";

import { FileIcon } from "./file-icon";
import { FileVersionBadge } from "./file-version-badge";
import { ImageWithFallback } from "./image-with-fallback";
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
  const isImage = mimeType.startsWith("image/");
  const hasPreview = Boolean(url);

  if (hasPreview && isImage) {
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
              className="size-12 bg-white object-cover"
              fallbackClassName="size-12 rounded-lg"
              filename={filename}
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
    <Button
      className={cn(
        "h-12 w-full justify-start gap-x-2 overflow-hidden",
        isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
      onClick={onClick}
      type="button"
      variant="outline-muted"
    >
      <FileIcon
        className="size-5 shrink-0 text-muted-foreground"
        filename={filename}
        mimeType={mimeType}
      />
      <span className="min-w-0 truncate text-left text-xs leading-tight">
        {filename}
      </span>
      <FileVersionBadge
        className="ml-auto shrink-0 text-[10px]"
        filePath={filePath}
        projectSubdomain={projectSubdomain}
        versionRef={versionRef}
      />
    </Button>
  );
}
