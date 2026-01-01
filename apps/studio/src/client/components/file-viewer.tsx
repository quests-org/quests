import { formatBytes, type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { Code2, Download, Eye, Loader2, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { FileActionsMenu } from "./file-actions-menu";
import { FileIcon } from "./file-icon";
import { FilePreviewFallback } from "./file-preview-fallback";
import { Markdown } from "./markdown";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

const fileViewerVariants = cva(
  "flex w-full flex-col overflow-hidden rounded border border-border bg-background",
  {
    defaultVariants: {
      error: false,
      fileType: "default",
    },
    variants: {
      error: {
        true: "h-auto max-w-2xl!",
      },
      fileType: {
        audio: "h-auto max-w-2xl",
        default: "h-[80vh] max-w-4xl",
        html: "h-[80vh] max-w-6xl",
        text: "h-[70vh] max-w-4xl",
      },
    },
  },
);

export function FileViewer({
  filename,
  filePath,
  fileSize,
  mimeType,
  onClose,
  onDownload,
  projectSubdomain,
  url,
}: {
  filename: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  onClose: () => void;
  onDownload?: () => void;
  projectSubdomain?: ProjectSubdomain;
  url: string;
}) {
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ behavior: "instant", top: 0 });
  }, [viewMode]);

  const isText = mimeType?.startsWith("text/");
  const isPdf = mimeType === "application/pdf";
  const isVideo = mimeType?.startsWith("video/");
  const isAudio = mimeType?.startsWith("audio/");

  const isMarkdown =
    isText && /\.(?:md|markdown|mdown|mkd|mdx)$/i.test(filename);
  const isHtml = isText && /\.html?$/i.test(filename);
  const hasPreview = isMarkdown || isHtml;

  const {
    data: textContent,
    error: fetchError,
    isLoading,
  } = useQuery({
    enabled: isText,
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response.text();
    },
    queryKey: ["text-file", url],
    // Ensures quick failure
    retry: false,
  });

  const handleCopy = async () => {
    if (!textContent) {
      return;
    }
    await navigator.clipboard.writeText(textContent);
  };

  const displayPath = filePath ?? filename;
  const showRawContent = !isText || viewMode === "raw" || !hasPreview;

  const getFileType = () => {
    if (isAudio) {
      return "audio";
    }
    if (isText && !isHtml) {
      return "text";
    }
    if (isHtml && !mediaLoadError) {
      return "html";
    }
    return "default";
  };

  const toolbarActions: ReactNode[] = [];

  if (onDownload) {
    toolbarActions.push(
      <Button key="download" onClick={onDownload} size="sm" variant="ghost">
        <Download className="size-4" />
      </Button>,
    );
  }

  if (isText && textContent) {
    toolbarActions.push(
      <FileActionsMenu
        filePath={filePath}
        key="actions"
        onCopy={handleCopy}
        projectSubdomain={projectSubdomain}
      />,
    );
  } else if (filePath) {
    toolbarActions.push(
      <FileActionsMenu
        filePath={filePath}
        key="actions"
        projectSubdomain={projectSubdomain}
      />,
    );
  }

  toolbarActions.push(
    <Button key="close" onClick={onClose} size="sm" variant="ghost">
      <X className="size-4" />
    </Button>,
  );

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={fileViewerVariants({
        error: !!fetchError,
        fileType: getFileType(),
      })}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
        <FileIcon
          className="size-4 shrink-0"
          filename={filename}
          mimeType={mimeType}
        />
        <span className="truncate text-xs text-muted-foreground">
          {displayPath}
        </span>
        {typeof fileSize === "number" && fileSize > 0 && (
          <Badge variant="secondary">{formatBytes(fileSize)}</Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          {isText && hasPreview && (
            <Tabs
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
          {toolbarActions}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto" ref={contentRef}>
        {fetchError ? (
          <div className="flex size-full items-center justify-center p-8">
            <Alert className="max-w-2xl" variant="destructive">
              <AlertTitle>Failed to load file</AlertTitle>
              <AlertDescription>
                {fetchError instanceof Error
                  ? fetchError.message
                  : "An unknown error occurred"}
                {"\n\n"}
                File: {filename}
              </AlertDescription>
            </Alert>
          </div>
        ) : mediaLoadError ? (
          <div className="flex size-full items-center justify-center">
            <FilePreviewFallback filename={filename} mimeType={mimeType} />
          </div>
        ) : isText && textContent ? (
          showRawContent ? (
            <pre className="p-8 text-sm text-foreground">{textContent}</pre>
          ) : isMarkdown ? (
            <div className="prose prose-sm max-w-none p-8 dark:prose-invert">
              <Markdown markdown={textContent} />
            </div>
          ) : isHtml ? (
            <iframe
              allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
              className="absolute inset-0 size-full border-0 bg-background"
              sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts allow-presentation"
              srcDoc={textContent}
              title={filename}
            />
          ) : (
            <pre className="p-8 text-sm text-foreground">{textContent}</pre>
          )
        ) : isPdf ? (
          <iframe
            className="absolute inset-0 size-full border-0"
            key={url}
            onError={() => {
              setMediaLoadError(true);
            }}
            src={url}
            title={filename}
          />
        ) : isVideo ? (
          <video
            className="size-full object-contain p-4"
            controls
            key={url}
            onError={() => {
              setMediaLoadError(true);
            }}
            src={url}
          />
        ) : isAudio ? (
          <div className="flex size-full items-center justify-center p-8">
            <audio
              className="w-full"
              controls
              key={url}
              onError={() => {
                setMediaLoadError(true);
              }}
              src={url}
            />
          </div>
        ) : (
          <div className="flex size-full items-center justify-center">
            <FilePreviewFallback filename={filename} mimeType={mimeType} />
          </div>
        )}
      </div>
    </div>
  );
}
