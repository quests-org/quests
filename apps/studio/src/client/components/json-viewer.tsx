import { formatBytes } from "@quests/workspace/client";
import { Download, Eye } from "lucide-react";
import { useCallback, useMemo } from "react";

import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface JsonViewerProps {
  data: unknown;
  downloadFilename?: string;
  maxDisplaySize?: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
}

export function JsonViewer({
  data,
  downloadFilename = "data",
  maxDisplaySize = 50_000, // 50KB default limit for display
  onOpenChange,
  open,
  title = "JSON Viewer",
}: JsonViewerProps) {
  const handleCopy = useCallback(async () => {
    const jsonData = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(jsonData);
  }, [data]);

  const handleDownload = useCallback(() => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadFilename}-${Date.now()}.json`;
    // eslint-disable-next-line unicorn/prefer-dom-node-append
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [data, downloadFilename]);

  const { displayData, isTruncated, originalSize } = useMemo(() => {
    const fullJsonString = JSON.stringify(data, null, 2);
    const bytes = new TextEncoder().encode(fullJsonString).length;

    if (bytes <= maxDisplaySize) {
      return {
        displayData: fullJsonString,
        isTruncated: false,
        originalSize: bytes,
      };
    }

    // Truncate at character level to stay under byte limit
    let truncated = fullJsonString.slice(0, Math.floor(maxDisplaySize * 0.8));

    // Try to truncate at a reasonable JSON boundary
    const lastNewline = truncated.lastIndexOf("\n");
    const lastComma = truncated.lastIndexOf(",");
    const lastBrace = Math.max(
      truncated.lastIndexOf("}"),
      truncated.lastIndexOf("]"),
    );

    const cutPoint = Math.max(lastNewline, lastComma, lastBrace);
    if (cutPoint > truncated.length * 0.5) {
      truncated = truncated.slice(0, cutPoint);
    }

    return {
      displayData: truncated + "\n\n... [truncated]",
      isTruncated: true,
      originalSize: bytes,
    };
  }, [data, maxDisplaySize]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-[90vw] bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning-foreground">
            <Eye className="size-4 text-warning-foreground" />
            {title}
            {isTruncated && (
              <span className="text-xs text-muted-foreground">
                (showing partial data - {formatBytes(originalSize)} total)
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and download JSON data
          </DialogDescription>
        </DialogHeader>
        <div className="relative min-w-0">
          <div className="pointer-events-auto absolute top-2 right-4 z-20 flex gap-2">
            <CopyButton
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
              onCopy={handleCopy}
            />
            <Button
              onClick={handleDownload}
              size="sm"
              title="Download full JSON"
              variant="ghost"
            >
              <Download className="size-4" />
            </Button>
          </div>
          <div className="max-h-[600px] min-w-0 overflow-auto">
            <pre className="min-w-0 rounded-md bg-muted p-4 text-xs break-all whitespace-pre-wrap text-foreground">
              {displayData}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
