import { X } from "lucide-react";

import { FileIcon } from "./file-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AttachmentItemProps {
  filename: string;
  onRemove?: () => void;
  previewUrl?: string;
}

export function AttachmentItem({
  filename,
  onRemove,
  previewUrl,
}: AttachmentItemProps) {
  const content = previewUrl ? (
    <div className="relative group size-12 shrink-0">
      <img
        alt={filename}
        className="size-12 rounded-lg object-cover border border-border"
        src={previewUrl}
      />
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
  ) : (
    <div className="relative group flex items-center gap-1.5 h-12 px-2.5 rounded-lg bg-muted/50 border border-border max-w-[180px]">
      <FileIcon
        className="size-5 shrink-0 text-muted-foreground"
        filename={filename}
      />
      <span className="text-xs leading-tight line-clamp-2 break-all">
        {filename}
      </span>
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top">
        <p>{filename}</p>
      </TooltipContent>
    </Tooltip>
  );
}
