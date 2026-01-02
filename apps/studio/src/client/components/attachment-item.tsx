import {
  type FileViewerFile,
  openFileViewerAtom,
} from "@/client/atoms/file-viewer";
import { cn } from "@/client/lib/utils";
import { formatBytes } from "@quests/workspace/client";
import { useSetAtom } from "jotai";
import { X } from "lucide-react";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { SandboxedHtmlIframe } from "./sandboxed-html-iframe";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AttachmentItemProps {
  filename: string;
  filePath?: string;
  gallery?: FileViewerFile[];
  imageClassName?: string;
  mimeType?: string;
  onRemove?: () => void;
  previewUrl?: string;
  showHtmlIframe?: boolean;
  size?: number;
}

export function AttachmentItem({
  filename,
  filePath,
  gallery,
  imageClassName,
  mimeType,
  onRemove,
  previewUrl,
  showHtmlIframe = false,
  size,
}: AttachmentItemProps) {
  const openFileViewer = useSetAtom(openFileViewerAtom);

  const isHtml = mimeType === "text/html";
  const shouldShowHtmlIframe = showHtmlIframe && isHtml && previewUrl;

  const handlePreviewClick = () => {
    if (previewUrl) {
      const files = gallery ?? [
        {
          filename,
          filePath,
          mimeType,
          size,
          url: previewUrl,
        },
      ];
      const currentIndex = gallery
        ? gallery.findIndex((f) => f.url === previewUrl)
        : 0;

      openFileViewer({
        currentIndex: currentIndex === -1 ? 0 : currentIndex,
        files,
      });
    }
  };

  const isImage = mimeType?.startsWith("image/");
  const hasPreview = Boolean(previewUrl);

  const htmlIframeContent = shouldShowHtmlIframe && (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-background",
        imageClassName,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-2.5 py-1.5">
        <FileIcon
          className="size-4 shrink-0 text-muted-foreground"
          filename={filename}
          mimeType={mimeType}
        />
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {filename}
        </span>
      </div>
      <div className="relative aspect-video w-full overflow-hidden">
        <SandboxedHtmlIframe
          className="absolute top-0 left-0 h-[300%] w-[300%] origin-top-left border-0"
          src={previewUrl}
          style={{ transform: "scale(0.333)" }}
          title={filename}
        />
        <button
          className="absolute inset-0 size-full"
          onClick={handlePreviewClick}
          type="button"
        />
      </div>
    </div>
  );

  const imageContent = hasPreview && isImage && previewUrl && (
    <div className={cn("group relative size-12 shrink-0", imageClassName)}>
      <Button
        className={cn("size-12 overflow-hidden p-0", imageClassName)}
        onClick={handlePreviewClick}
        type="button"
        variant="outline"
      >
        <ImageWithFallback
          alt={filename}
          className={cn("size-12 bg-white object-cover", imageClassName)}
          fallbackClassName={cn("size-12 rounded-lg", imageClassName)}
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

  const fileContent = (
    <div className="group relative h-12 min-w-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="h-full w-full justify-start gap-x-2 overflow-hidden bg-muted/50 px-2.5"
            onClick={handlePreviewClick}
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
        </TooltipTrigger>
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

  if (imageContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{imageContent}</TooltipTrigger>
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

  if (htmlIframeContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{htmlIframeContent}</TooltipTrigger>
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

  return fileContent;
}
