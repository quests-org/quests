import { useSyntaxHighlighting } from "@/client/hooks/use-syntax-highlighting";
import { formatBytes } from "@quests/workspace/client";
import { Braces, Download, FileText } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { CopyButton } from "./copy-button";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

type DebugViewerTab = "json" | "markdown";

export function DebugViewer({
  downloadFilename = "data",
  jsonData,
  markdownData,
  maxDisplaySize = 1_000_000,
  onOpenChange,
  open,
  title = "Debug Viewer",
}: {
  downloadFilename?: string;
  jsonData: unknown;
  markdownData: null | string;
  maxDisplaySize?: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title?: string;
}) {
  const [tab, setTab] = useState<DebugViewerTab>("markdown");

  const jsonContent = useMemo(
    () => JSON.stringify(jsonData, null, 2),
    [jsonData],
  );
  const markdownContent = markdownData ?? "";

  const rawContent = tab === "json" ? jsonContent : markdownContent;

  const { displayContent, isTruncated, originalSize } = useMemo(() => {
    const bytes = new TextEncoder().encode(rawContent).length;

    if (bytes <= maxDisplaySize) {
      return {
        displayContent: rawContent,
        isTruncated: false,
        originalSize: bytes,
      };
    }

    let truncated = rawContent.slice(0, Math.floor(maxDisplaySize * 0.8));

    if (tab === "json") {
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
    }

    return {
      displayContent: truncated + "\n\n... [truncated]",
      isTruncated: true,
      originalSize: bytes,
    };
  }, [rawContent, maxDisplaySize, tab]);

  const mimeType = tab === "json" ? "application/json" : "text/markdown";
  const extension = tab === "json" ? "json" : "md";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(rawContent);
  }, [rawContent]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([rawContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${downloadFilename}-${Date.now()}.${extension}`;
    // eslint-disable-next-line unicorn/prefer-dom-node-append
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rawContent, mimeType, downloadFilename, extension]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] w-[95vw] bg-background sm:max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-warning-foreground">
            <span>{title}</span>
            <Tabs
              onValueChange={(v) => {
                setTab(v as DebugViewerTab);
              }}
              value={tab}
            >
              <TabsList>
                <TabsTrigger value="markdown">
                  <FileText className="size-3.5" />
                  Markdown
                </TabsTrigger>
                <TabsTrigger value="json">
                  <Braces className="size-3.5" />
                  JSON
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {isTruncated && (
              <span className="text-xs font-normal text-muted-foreground">
                (showing partial data - {formatBytes(originalSize)} total)
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and download chat debug data
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
              title={`Download ${tab}`}
              variant="ghost"
            >
              <Download className="size-4" />
            </Button>
          </div>
          <HighlightedContent content={displayContent} language={tab} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HighlightedContent({
  content,
  language,
}: {
  content: string;
  language: DebugViewerTab;
}) {
  const { highlightedHtml } = useSyntaxHighlighting({
    code: content,
    language,
  });

  return (
    <div className="max-h-[75vh] min-w-0 overflow-auto">
      {highlightedHtml ? (
        <div
          className="min-w-0 rounded-md bg-muted p-4 text-xs [&_code]:break-all [&_code]:!whitespace-pre-wrap [&_pre]:break-all [&_pre]:!whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: highlightedHtml.join("\n") }}
        />
      ) : (
        <pre className="min-w-0 rounded-md bg-muted p-4 text-xs break-all whitespace-pre-wrap text-foreground">
          {content}
        </pre>
      )}
    </div>
  );
}
