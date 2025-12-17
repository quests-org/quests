import { openFileViewerAtom } from "@/client/atoms/file-viewer";
import { cn } from "@/client/lib/utils";
import { useSetAtom } from "jotai";
import { X } from "lucide-react";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { TruncatedText } from "./truncated-text";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AttachmentItemProps {
  filename: string;
  mimeType?: string;
  onRemove?: () => void;
  previewUrl?: string;
  size?: number;
}

export function AttachmentItem({
  filename,
  mimeType,
  onRemove,
  previewUrl,
  size,
}: AttachmentItemProps) {
  const openFileViewer = useSetAtom(openFileViewerAtom);

  const handlePreviewClick = () => {
    if (previewUrl) {
      openFileViewer({
        filename,
        mimeType,
        size,
        url: previewUrl,
      });
    }
  };

  const isImage = mimeType?.startsWith("image/");
  const isSvg = mimeType === "image/svg+xml";
  const hasPreview = Boolean(previewUrl);

  const imageContent = hasPreview && isImage && previewUrl && (
    <div className="relative group size-12 shrink-0">
      <button
        className="size-12 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-ring transition-all"
        onClick={handlePreviewClick}
        type="button"
      >
        <ImageWithFallback
          alt={filename}
          className={cn(
            "size-12",
            isSvg ? "object-contain bg-white p-1.5" : "object-cover",
          )}
          fallbackClassName="size-12 rounded-lg"
          filename={filename}
          src={previewUrl}
        />
      </button>
      {onRemove && (
        <button
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
          onClick={onRemove}
          type="button"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );

  const fileContent = (
    <div className="relative group flex items-center gap-1.5 h-12 px-2.5 rounded-lg bg-muted/50 border border-border max-w-[180px] hover:ring-2 hover:ring-ring transition-all">
      <button
        className="flex items-center gap-1.5 min-w-0"
        onClick={handlePreviewClick}
        type="button"
      >
        <FileIcon
          className="size-5 shrink-0 text-muted-foreground"
          filename={filename}
        />
        <TruncatedText
          className="text-xs leading-tight text-left"
          maxLength={30}
        >
          {filename}
        </TruncatedText>
      </button>
      {onRemove && (
        <button
          className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
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
