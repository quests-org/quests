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
  const hasPreview = Boolean(previewUrl);

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
          className={cn(
            "size-12 bg-white object-contain p-1.5",
            imageClassName,
          )}
          fallbackClassName={cn("size-12 rounded-lg", imageClassName)}
          filename={filename}
          src={previewUrl}
        />
      </Button>
      {onRemove && (
        <Button
          className="absolute -top-1.5 -right-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="icon-sm"
          type="button"
          variant="ghost-destructive"
        >
          <X />
        </Button>
      )}
    </div>
  );

  const fileContent = (
    <div className="group relative h-12 max-w-[180px]">
      <Button
        className="h-full w-full justify-start overflow-hidden bg-muted/50 px-2.5"
        onClick={handlePreviewClick}
        size="sm"
        type="button"
        variant="outline"
      >
        <FileIcon
          className="size-5 text-muted-foreground"
          filename={filename}
          mimeType={mimeType}
        />
        <TruncatedText
          className="min-w-0 overflow-hidden text-left text-xs leading-tight text-ellipsis"
          maxLength={30}
        >
          {filename}
        </TruncatedText>
      </Button>
      {onRemove && (
        <Button
          className="absolute -top-1.5 -right-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="icon-sm"
          type="button"
          variant="ghost-destructive"
        >
          <X />
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
          <p>{filename}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return fileContent;
}
