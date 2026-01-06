import { formatBytes } from "@quests/workspace/client";
import { X } from "lucide-react";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface UploadedFilePreviewProps {
  filename: string;
  mimeType?: string;
  onClick?: () => void;
  onRemove?: () => void;
  size?: number;
  url?: string;
}

export function UploadedFilePreview({
  filename,
  mimeType,
  onClick,
  onRemove,
  size,
  url,
}: UploadedFilePreviewProps) {
  const isImage = mimeType?.startsWith("image/");
  const hasPreview = Boolean(url);

  const content = (() => {
    if (hasPreview && isImage && url) {
      return (
        <div className="group relative size-12 shrink-0">
          <Button
            className="size-12 overflow-hidden p-0"
            onClick={onClick}
            type="button"
            variant="outline"
          >
            <ImageWithFallback
              alt={filename}
              className="size-full bg-white object-cover"
              fallbackClassName="size-full"
              filename={filename}
              src={url}
            />
          </Button>
          {onRemove && (
            <button
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border border-border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-muted"
              onClick={onRemove}
              type="button"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="group relative h-12 min-w-0">
        <Button
          className="h-full w-full justify-start gap-x-2"
          onClick={onClick}
          type="button"
          variant="outline"
        >
          <FileIcon
            className="size-5 shrink-0 text-muted-foreground"
            filename={filename}
            mimeType={mimeType}
          />
          <span className="min-w-0 truncate text-xs">{filename}</span>
        </Button>
        {onRemove && (
          <button
            className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border border-border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-muted"
            onClick={onRemove}
            type="button"
          >
            <X className="size-3" />
          </button>
        )}
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
        <div className="flex items-center gap-2">
          <p>{filename}</p>
          {size && <Badge variant="secondary">{formatBytes(size)}</Badge>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
