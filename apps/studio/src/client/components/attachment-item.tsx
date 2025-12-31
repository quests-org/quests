import {
  type FileViewerFile,
  openFileViewerAtom,
} from "@/client/atoms/file-viewer";
import { cn } from "@/client/lib/utils";
import { useSetAtom } from "jotai";
import { X } from "lucide-react";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { TruncatedText } from "./truncated-text";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AttachmentItemProps {
  filename: string;
  filePath?: string;
  gallery?: FileViewerFile[];
  imageClassName?: string;
  mimeType?: string;
  onRemove?: () => void;
  previewUrl?: string;
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
  size,
}: AttachmentItemProps) {
  const openFileViewer = useSetAtom(openFileViewerAtom);

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
  const isSvg = mimeType === "image/svg+xml";
  const hasPreview = Boolean(previewUrl);

  const imageContent = hasPreview && isImage && previewUrl && (
    <div className={cn("group relative size-12 shrink-0", imageClassName)}>
      <button
        className={cn(
          "size-12 overflow-hidden rounded-lg border border-border transition-all hover:ring-2 hover:ring-ring",
          imageClassName,
        )}
        onClick={handlePreviewClick}
        type="button"
      >
        <ImageWithFallback
          alt={filename}
          className={cn(
            "size-12",
            isSvg ? "bg-white object-contain p-1.5" : "object-cover",
            imageClassName,
          )}
          fallbackClassName={cn("size-12 rounded-lg", imageClassName)}
          filename={filename}
          src={previewUrl}
        />
      </button>
      {onRemove && (
        <button
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
          onClick={onRemove}
          type="button"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );

  const fileContent = (
    <div className="group relative flex h-12 max-w-[180px] items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 transition-all hover:ring-2 hover:ring-ring">
      <button
        className="flex min-w-0 items-center gap-1.5"
        onClick={handlePreviewClick}
        type="button"
      >
        <FileIcon
          className="size-5 shrink-0 text-muted-foreground"
          filename={filename}
          mimeType={mimeType}
        />
        <TruncatedText
          className="text-left text-xs leading-tight"
          maxLength={30}
        >
          {filename}
        </TruncatedText>
      </button>
      {onRemove && (
        <button
          className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
          onClick={onRemove}
          type="button"
        >
          <X className="size-3" />
        </button>
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
          <p>{filename}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return fileContent;
}
