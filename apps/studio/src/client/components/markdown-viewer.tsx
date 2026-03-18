import { formatBytes } from "@quests/workspace/client";
import { Download, FileText } from "lucide-react";

import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function MarkdownViewer({
  data,
  downloadFilename = "session",
  maxDisplaySize = 100_000,
  onOpenChange,
  open,
  title = "Markdown Viewer",
}: {
  data: null | string;
  downloadFilename?: string;
  maxDisplaySize?: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
}) {
  const content = data ?? "";
  const bytes = new TextEncoder().encode(content).length;
  const isTruncated = bytes > maxDisplaySize;
  const displayContent = isTruncated
    ? content.slice(0, Math.floor(maxDisplaySize * 0.8)) + "\n\n... [truncated]"
    : content;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadFilename}-${Date.now()}.md`;
    // eslint-disable-next-line unicorn/prefer-dom-node-append
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] w-[95vw] bg-background sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning-foreground">
            <FileText className="size-4 text-warning-foreground" />
            {title}
            {isTruncated && (
              <span className="text-xs text-muted-foreground">
                (showing partial data - {formatBytes(bytes)} total)
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and download session markdown
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
              title="Download markdown"
              variant="ghost"
            >
              <Download className="size-4" />
            </Button>
          </div>
          <div className="max-h-[75vh] min-w-0 overflow-auto">
            <pre className="min-w-0 rounded-md bg-muted p-4 text-xs break-all whitespace-pre-wrap text-foreground">
              {displayContent}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
