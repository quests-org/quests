import { cn } from "@/client/lib/utils";
import { type ProjectSubdomain } from "@quests/workspace/client";

import { FileIcon } from "./file-icon";
import { FileVersionBadge } from "./file-version-badge";
import { ImageWithFallback } from "./image-with-fallback";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function FilePreviewListItem({
  filename,
  filePath,
  isSelected = false,
  mimeType,
  onClick,
  projectSubdomain,
  url,
  versionRef,
}: {
  filename: string;
  filePath: string;
  isSelected?: boolean;
  mimeType: string;
  onClick: () => void;
  projectSubdomain: ProjectSubdomain;
  url: string;
  versionRef: string;
}) {
  const isImage = mimeType.startsWith("image/");
  const hasPreview = Boolean(url);
  const showVersionBadge = filePath && projectSubdomain && versionRef;

  const content = (() => {
    if (hasPreview && isImage) {
      return (
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
            mimeType={mimeType}
            src={url}
          />
        </Button>
      );
    }

    return (
      <div className="relative h-12 min-w-0">
        <Button
          className={cn(
            "h-full w-full justify-start gap-x-2 overflow-hidden bg-background!",
            isSelected &&
              "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          onClick={onClick}
          type="button"
          variant="outline"
        >
          <FileIcon
            className="size-5 shrink-0 text-muted-foreground"
            filename={filename}
            mimeType={mimeType}
          />
          <span className="min-w-0 truncate text-left text-xs leading-tight">
            {filename}
          </span>
          {showVersionBadge && (
            <FileVersionBadge
              className="ml-auto shrink-0 text-[10px]"
              filePath={filePath}
              projectSubdomain={projectSubdomain}
              versionRef={versionRef}
            />
          )}
        </Button>
      </div>
    );
  })();

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        className="max-w-[min(500px,90vw)] wrap-break-word"
        collisionPadding={10}
      >
        <div className="flex items-center gap-x-2">
          <span>{filePath}</span>
          {showVersionBadge && (
            <FileVersionBadge
              className="shrink-0 text-[10px]"
              filePath={filePath}
              projectSubdomain={projectSubdomain}
              versionRef={versionRef}
            />
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
