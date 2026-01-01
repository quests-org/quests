import { useQuery } from "@tanstack/react-query";
import { Check, Code2, Copy, Eye, Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/utils";
import { FileIcon } from "./file-icon";
import { Markdown } from "./markdown";
import { TruncatedText } from "./truncated-text";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

export function TextFileViewer({
  filename,
  mimeType,
  onBackgroundClick,
  url,
}: {
  filename: string;
  mimeType?: string;
  onBackgroundClick?: () => void;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");

  const isMarkdown = /\.(?:md|markdown|mdown|mkd|mdx)$/i.test(filename);
  const isHtml = /\.html?$/i.test(filename);
  const hasPreview = isMarkdown || isHtml;

  const { data, error, isLoading } = useQuery({
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response.text();
    },
    queryKey: ["text-file", url],
  });

  const handleCopy = async () => {
    if (!data) {
      return;
    }
    await navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div
        className="flex size-full items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onBackgroundClick?.();
          }
        }}
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex size-full items-center justify-center p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onBackgroundClick?.();
          }
        }}
      >
        <Alert className="max-w-2xl" variant="destructive">
          <AlertTitle>Failed to load file</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
            {"\n\n"}
            File: {filename}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const showRawContent = viewMode === "raw" || !hasPreview;

  return (
    <div
      className="flex size-full items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onBackgroundClick?.();
        }
      }}
    >
      <div
        className={cn(
          "flex h-[70vh] w-full flex-col overflow-hidden rounded border border-border bg-background",
          !isHtml && "max-w-4xl",
        )}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
          <FileIcon
            className="size-4 shrink-0"
            filename={filename}
            mimeType={mimeType}
          />
          <TruncatedText
            className="text-xs text-muted-foreground"
            maxLength={60}
          >
            {filename}
          </TruncatedText>
          {hasPreview && (
            <Tabs
              className="ml-auto"
              onValueChange={(value) => {
                setViewMode(value as "preview" | "raw");
              }}
              value={viewMode}
            >
              <TabsList>
                <TabsTrigger value="preview">
                  <Eye className="size-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="raw">
                  <Code2 className="size-4" />
                  Code
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Button onClick={handleCopy} size="sm" variant="ghost">
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
        <div className="relative min-h-0 flex-1 overflow-auto">
          {showRawContent ? (
            <pre className="p-8 text-sm text-foreground">{data}</pre>
          ) : isMarkdown ? (
            <div className="prose prose-sm max-w-none p-8 dark:prose-invert">
              <Markdown markdown={data} />
            </div>
          ) : isHtml ? (
            <iframe
              allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
              className="absolute inset-0 size-full border-0 bg-background"
              sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts allow-presentation"
              srcDoc={data}
              title={filename}
            />
          ) : (
            <pre className="p-8 text-sm text-foreground">{data}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
