import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

import { FileIcon } from "./file-icon";
import { Markdown } from "./markdown";
import { TruncatedText } from "./truncated-text";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

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
  const isMarkdown = /\.(?:md|markdown|mdown|mkd|mdx)$/i.test(filename);

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
        <Loader2 className="size-8 animate-spin text-white/60" />
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

  return (
    <div
      className="flex size-full items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onBackgroundClick?.();
        }
      }}
    >
      <div className="flex max-h-[70vh] w-full max-w-4xl flex-col overflow-hidden rounded border border-white/10 bg-background">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-muted/30 px-4 py-2">
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
          <Button
            className="ml-auto"
            onClick={handleCopy}
            size="sm"
            variant="ghost"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {isMarkdown ? (
            <div className="prose p-8 prose-invert">
              <Markdown markdown={data} />
            </div>
          ) : (
            <pre className="p-8 text-sm text-foreground">{data}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
