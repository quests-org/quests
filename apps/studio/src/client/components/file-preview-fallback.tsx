import { Download } from "lucide-react";

import { FileIcon } from "./file-icon";
import { Button } from "./ui/button";

export function FilePreviewFallback({
  fallbackExtension,
  filename,
  onDownload,
}: {
  fallbackExtension?: string;
  filename: string;
  onDownload?: () => void;
}) {
  return (
    <div className="dark flex w-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center text-foreground">
      <div className="flex size-32 items-center justify-center rounded-lg bg-accent">
        <FileIcon
          className="size-16"
          fallbackExtension={fallbackExtension}
          filename={filename}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-white">Preview not available</p>
        <p className="mt-1 text-xs text-white/60">
          {onDownload
            ? "Download this file to view it"
            : "This file cannot be previewed"}
        </p>
      </div>
      {onDownload && (
        <Button onClick={onDownload} size="sm">
          <Download className="size-4" />
          Download
        </Button>
      )}
    </div>
  );
}
