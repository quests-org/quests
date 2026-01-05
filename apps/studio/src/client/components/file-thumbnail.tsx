import { formatBytes } from "@quests/workspace/client";
import { X } from "lucide-react";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function FileThumbnail({
  filename,
  isSelected,
  mimeType,
  onClick,
  onRemove,
  previewUrl,
  showTooltip = true,
  size,
}: {
  filename: string;
  isSelected?: boolean;
  mimeType?: string;
  onClick?: () => void;
  onRemove?: () => void;
  previewUrl?: string;
  showTooltip?: boolean;
  size?: number;
}) {
  const isImage = mimeType?.startsWith("image/");
  const hasPreview = Boolean(previewUrl);

  const content = (() => {
    if (hasPreview && isImage && previewUrl) {
      return (
        <div className="group relative size-12 shrink-0">
          <Button
            className={`size-12 overflow-hidden p-0 ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            onClick={onClick}
            type="button"
            variant="outline"
          >
            <ImageWithFallback
              alt={filename}
              className="size-12 bg-white object-cover"
              fallbackClassName="size-12 rounded-lg"
              filename={filename}
              src={previewUrl}
            />
          </Button>
          {onRemove && (
            <Button
              className="absolute -top-2 -right-2 size-5 rounded-full bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-muted"
              onClick={onRemove}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="group relative h-12 min-w-0">
        <Button
          className={`h-full w-full justify-start gap-x-2 overflow-hidden bg-muted/50 px-2.5 ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
          onClick={onClick}
          size="sm"
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
        </Button>
        {onRemove && (
          <Button
            className="absolute -top-2 -right-2 size-5 rounded-full bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-muted"
            onClick={onRemove}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X className="size-3" />
          </Button>
        )}
      </div>
    );
  })();

  if (!showTooltip) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        className="max-w-[min(500px,90vw)] wrap-break-word"
        collisionPadding={10}
      >
        <div className="flex items-center gap-2">
          <p>{filename}</p>
          {size && <Badge variant="secondary">{formatBytes(size)}</Badge>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
