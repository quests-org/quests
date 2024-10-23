import { Copy, Download, Eye } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface JsonViewerProps {
  data: unknown;
  downloadFilename?: string;
  maxDisplaySize?: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
}

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;

export function JsonViewer({
  data,
  downloadFilename = "data",
  maxDisplaySize = 50_000, // 50KB default limit for display
  onOpenChange,
  open,
  title = "JSON Viewer",
}: JsonViewerProps) {
  const handleCopy = useCallback(() => {
    const jsonData = JSON.stringify(data, null, 2);
    void navigator.clipboard.writeText(jsonData);
    const bytes = new TextEncoder().encode(jsonData).length;
    const size =
      bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
    toast.success(`JSON data copied to clipboard (${size})`);
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
      <DialogContent className="max-w-[90vw] border-warning/30 bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning-foreground">
            <Eye className="size-4 text-warning" />
            {title}
            {isTruncated && (
              <span className="text-xs text-muted-foreground">
                (showing partial data - {formatSize(originalSize)} total)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="relative min-w-0">
          <div className="absolute right-4 top-2 z-20 flex gap-2 pointer-events-auto">
            <Button
              onClick={handleCopy}
              size="sm"
              title="Copy to clipboard"
              variant="ghost"
            >
              <Copy className="size-4" />
            </Button>
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
            <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-4 text-xs text-foreground min-w-0">
              {displayData}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
