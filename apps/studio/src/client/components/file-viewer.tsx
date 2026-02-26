import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { getLanguageFromFilePath } from "@/client/lib/file-extension-to-language";
import { getFileType } from "@/client/lib/get-file-type";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Code2, Eye, Loader2, Maximize2, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { tv } from "tailwind-variants";

import { useSyntaxHighlighting } from "../hooks/use-syntax-highlighting";
import { FileActionsMenu } from "./file-actions-menu";
import { FileIcon } from "./file-icon";
import { FilePreviewFallback } from "./file-preview-fallback";
import { FileVersionBadge } from "./file-version-badge";
import { SandboxedHtmlIframe } from "./sandboxed-html-iframe";
import { SessionMarkdown } from "./session-markdown";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function MarkdownPreview({ url }: { url: string }) {
  const { data, error, isLoading } = useQuery({
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response.text();
    },
    queryKey: ["markdown-file", url],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex size-full items-center justify-center p-8">
        <Alert className="max-w-2xl" variant="destructive">
          <AlertTitle>Failed to load file</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <SessionMarkdown className="p-8" markdown={data ?? ""} />;
}

function TextView({
  children,
  filename,
  url,
}: {
  children: (text: string) => ReactNode;
  filename: string;
  url: string;
}) {
  const { data, error, isLoading } = useQuery({
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response.text();
    },
    queryKey: ["text-file", url],
    retry: false, // Ensures fast failure
  });

  const language = getLanguageFromFilePath(filename);
  const { highlightedHtml } = useSyntaxHighlighting({
    code: language ? data : undefined,
    language,
  });

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex size-full items-center justify-center p-8">
        <Alert className="max-w-2xl" variant="destructive">
          <AlertTitle>Failed to load file</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (highlightedHtml) {
    return (
      <div
        className="p-4 text-sm"
        dangerouslySetInnerHTML={{ __html: highlightedHtml.join("\n") }}
      />
    );
  }

  if (language) {
    // Delay showing plain text fallback to give syntax highlighting time to load
    return (
      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ delay: 0.3, duration: 0 }}
      >
        {children(data ?? "")}
      </motion.div>
    );
  }

  return <>{children(data ?? "")}</>;
}

const fileViewerVariants = tv({
  base: "flex w-full flex-col overflow-hidden rounded-lg border border-border bg-background",
  defaultVariants: {
    error: false,
    fileType: "default",
    fullSize: false,
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
    fullSize: {
      true: "h-full max-w-none!",
    },
  },
});

export function FileViewer({
  file,
  fullSize = false,
  onClose,
  onDownload,
  onExpand,
}: {
  file: ProjectFileViewerFile;
  fullSize?: boolean;
  onClose: () => void;
  onDownload?: () => void;
  onExpand?: () => void;
}) {
  const { filename, filePath, mimeType, projectSubdomain, url, versionRef } =
    file;
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [mediaLoadError, setMediaLoadError] = useState(false);
  const [mediaErrorType, setMediaErrorType] = useState<string | undefined>();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ behavior: "instant", top: 0 });
  }, [viewMode]);

  const fileType = getFileType(file);
  const hasPreview = fileType === "markdown" || fileType === "html";

  const handleCopy = async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const text = await response.text();
      await navigator.clipboard.writeText(text);
    } catch (error) {
      toast.error("Failed to copy", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const getViewerLayoutType = () => {
    if (fileType === "audio") {
      return "audio";
    }
    if (fileType === "code" || fileType === "text") {
      return "text";
    }
    if (fileType === "html" && !mediaLoadError) {
      return "html";
    }
    return "default";
  };

  const toolbarActions: ReactNode[] = [];

  if (filePath && projectSubdomain) {
    toolbarActions.push(
      <FileActionsMenu
        filePath={filePath}
        key="actions"
        onCopy={
          fileType === "code" ||
          fileType === "text" ||
          fileType === "markdown" ||
          fileType === "html"
            ? handleCopy
            : undefined
        }
        onDownload={onDownload}
        projectSubdomain={projectSubdomain}
        versionRef={versionRef}
      />,
    );
  }

  if (onExpand) {
    toolbarActions.push(
      <Tooltip key="expand">
        <TooltipTrigger asChild>
          <Button onClick={onExpand} size="sm" variant="ghost">
            <Maximize2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Expand</p>
        </TooltipContent>
      </Tooltip>,
    );
  }

  toolbarActions.push(
    <Button key="close" onClick={onClose} size="sm" variant="ghost">
      <X className="size-4" />
    </Button>,
  );

  return (
    <div
      className={fileViewerVariants({
        error: false,
        fileType: getViewerLayoutType(),
        fullSize,
      })}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
        <FileIcon
          className="size-4 shrink-0"
          filename={filename}
          mimeType={mimeType}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate text-xs text-muted-foreground">
              {filePath}
            </span>
          </TooltipTrigger>
          <TooltipContent
            className="max-w-[min(500px,90vw)] wrap-break-word"
            collisionPadding={10}
          >
            {filePath}
          </TooltipContent>
        </Tooltip>
        {filePath && projectSubdomain && versionRef && (
          <FileVersionBadge
            filePath={filePath}
            projectSubdomain={projectSubdomain}
            versionRef={versionRef}
          />
        )}
        <div className="ml-auto flex items-center gap-1">
          {hasPreview && (
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
        {mediaLoadError ? (
          <div className="flex size-full items-center justify-center">
            <FilePreviewFallback
              fallbackExtension={mediaErrorType}
              filename={filename}
              onDownload={onDownload}
            />
          </div>
        ) : fileType === "markdown" && viewMode === "preview" ? (
          <MarkdownPreview url={url} />
        ) : fileType === "html" && viewMode === "preview" ? (
          <SandboxedHtmlIframe
            className="absolute inset-0 size-full border-0"
            src={url}
            title={filename}
          />
        ) : fileType === "code" ||
          fileType === "text" ||
          (fileType === "html" && viewMode === "raw") ||
          (fileType === "markdown" && viewMode === "raw") ? (
          <TextView filename={filename} url={url}>
            {(text) => (
              <pre className="p-4 text-sm text-foreground">{text}</pre>
            )}
          </TextView>
        ) : fileType === "pdf" ? (
          <iframe
            className="absolute inset-0 size-full border-0"
            key={url}
            onError={() => {
              setMediaLoadError(true);
              setMediaErrorType("pdf");
            }}
            src={url}
            title={filename}
          />
        ) : fileType === "video" ? (
          <video
            autoPlay
            className="size-full object-contain p-4"
            controls
            key={url}
            onError={() => {
              setMediaLoadError(true);
              setMediaErrorType("mp4");
            }}
            src={url}
          />
        ) : fileType === "audio" ? (
          <div className="flex size-full items-center justify-center p-8">
            <audio
              autoPlay
              className="w-full"
              controls
              key={url}
              onError={() => {
                setMediaLoadError(true);
                setMediaErrorType("mp3");
              }}
              src={url}
            />
          </div>
        ) : (
          <div className="flex size-full items-center justify-center">
            <FilePreviewFallback
              fallbackExtension="bin"
              filename={filename}
              onDownload={onDownload}
            />
          </div>
        )}
      </div>
    </div>
  );
}
