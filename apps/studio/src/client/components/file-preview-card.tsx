import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { getFileType } from "@/client/lib/get-file-type";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { useRef, useState } from "react";

import { FileActionsMenu, FileActionsMenuItems } from "./file-actions-menu";
import { FileIcon } from "./file-icon";
import { FileVersionBadge } from "./file-version-badge";
import { ImageWithFallback } from "./image-with-fallback";
import { Markdown } from "./markdown";
import { SandboxedHtmlIframe } from "./sandboxed-html-iframe";
import { Badge } from "./ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function FilePreviewCard({
  file,
  hideActionsMenu,
  onClick,
}: {
  file: ProjectFileViewerFile;
  hideActionsMenu?: boolean;
  onClick: () => void;
}) {
  const { filename, mimeType, url } = file;
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoTimeoutRef = useRef<null | number>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<null | number>(null);
  const [videoDuration, setVideoDuration] = useState<null | number>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileType = getFileType({ filename, mimeType });

  const handleMouseEnter = () => {
    if (fileType === "video" && videoRef.current) {
      videoTimeoutRef.current = window.setTimeout(() => {
        void videoRef.current?.play();
        setIsPlaying(true);
      }, 500);
    }
  };

  const handleMouseLeave = () => {
    if (fileType === "video" && videoRef.current) {
      if (videoTimeoutRef.current !== null) {
        clearTimeout(videoTimeoutRef.current);
        videoTimeoutRef.current = null;
      }
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  if (fileType === "markdown" || fileType === "text") {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="group relative overflow-hidden rounded-lg border border-border bg-background">
            <PreviewHeader
              file={file}
              hideActionsMenu={hideActionsMenu}
              onClick={onClick}
            />
            <div className="relative w-full overflow-hidden">
              <div className="max-h-64 overflow-hidden bg-background">
                {fileType === "markdown" ? (
                  <MarkdownPreview url={url} />
                ) : (
                  <TextPreview url={url} />
                )}
              </div>
              <button
                className="absolute inset-0 size-full"
                onClick={onClick}
                type="button"
              />
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <FileActionsMenuItems file={file} variant="context" />
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="group relative overflow-hidden rounded-lg border border-border bg-background transition-colors hover:bg-muted"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <PreviewHeader
            file={file}
            hideActionsMenu={hideActionsMenu}
            onClick={onClick}
          />
          <div className="relative aspect-video w-full overflow-hidden">
            {fileType === "image" ? (
              <div className="flex size-full items-center justify-center">
                <ImageWithFallback
                  alt={filename}
                  className="max-h-full max-w-full object-contain"
                  fallbackClassName="size-full"
                  filename={filename}
                  showCheckerboard
                  src={url}
                />
              </div>
            ) : fileType === "html" ? (
              <SandboxedHtmlIframe
                className="absolute top-0 left-0 size-[300%] origin-top-left border-0"
                restrictInteractive
                src={url}
                style={{ transform: "scale(0.333)" }}
                title={filename}
              />
            ) : fileType === "pdf" ? (
              <iframe
                className="absolute top-0 left-0 size-[300%] origin-top-left border-0"
                // cspell:ignore navpanes
                src={`${url}#toolbar=0&navpanes=0&view=Fit`}
                style={{ transform: "scale(0.333)" }}
                title={filename}
              />
            ) : fileType === "video" ? (
              <>
                <video
                  className="size-full bg-black object-contain"
                  loop
                  muted
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    setVideoDuration(video.duration);
                  }}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    const progress = video.duration
                      ? (video.currentTime / video.duration) * 100
                      : 0;
                    setVideoProgress(progress);
                    const remaining = video.duration
                      ? video.duration - video.currentTime
                      : null;
                    setTimeRemaining(remaining);
                  }}
                  ref={videoRef}
                  src={url}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity group-hover:opacity-0">
                  <div className="rounded-full bg-white/90 p-2 shadow-lg">
                    <Play className="size-4 fill-black text-black" />
                  </div>
                </div>
                {(isPlaying
                  ? timeRemaining !== null && timeRemaining > 0
                  : videoDuration !== null) && (
                  <div className="absolute right-2 bottom-2">
                    <Badge
                      className="bg-black/70 text-white hover:bg-black/70"
                      variant="secondary"
                    >
                      {formatTime(
                        isPlaying && timeRemaining !== null
                          ? timeRemaining
                          : (videoDuration ?? 0),
                      )}
                    </Badge>
                  </div>
                )}
                {isPlaying && (
                  <div className="absolute right-0 bottom-0 left-0 h-1 bg-black/50">
                    <div
                      className="h-full bg-white transition-all duration-100"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex size-full items-center justify-center">
                <FileIcon
                  className="size-16 text-muted-foreground"
                  filename={filename}
                  mimeType={mimeType}
                />
              </div>
            )}
            <button
              className="absolute inset-0 size-full"
              onClick={onClick}
              type="button"
            />
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <FileActionsMenuItems file={file} variant="context" />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function MarkdownPreview({ url }: { url: string }) {
  const { data, error, isLoading } = useQuery({
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response.text();
    },
    queryKey: ["markdown-preview", url],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex size-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Failed to load preview</p>
      </div>
    );
  }

  const lines = data ? data.split("\n") : [];
  const isTruncated = lines.length > 10;
  const truncatedContent = lines.slice(0, 10).join("\n");

  return (
    <div className="relative">
      <div className="prose prose-sm size-full overflow-hidden p-3 text-xs dark:prose-invert prose-headings:text-sm prose-h1:text-base prose-h2:text-sm prose-h3:text-sm">
        <Markdown markdown={truncatedContent} />
      </div>
      {isTruncated && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-linear-to-t from-background to-transparent" />
      )}
    </div>
  );
}

function PreviewHeader({
  file,
  hideActionsMenu,
  onClick,
}: {
  file: ProjectFileViewerFile;
  hideActionsMenu?: boolean;
  onClick?: () => void;
}) {
  const { filename, filePath, projectSubdomain, versionRef } = file;

  return (
    <div className="flex w-full items-center gap-2 border-b border-border bg-muted/30 px-2.5 py-1.5">
      <button
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={onClick}
        type="button"
      >
        <FileIcon
          className="size-4 shrink-0 text-muted-foreground"
          filename={filename}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="min-w-0 truncate text-xs text-muted-foreground">
              {filename}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <span className="break-all">{filePath}</span>
          </TooltipContent>
        </Tooltip>
        <FileVersionBadge
          className="shrink-0 text-[10px]"
          filePath={filePath}
          projectSubdomain={projectSubdomain}
          versionRef={versionRef}
        />
      </button>
      {!hideActionsMenu && <FileActionsMenu file={file} />}
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const { data, error, isLoading } = useQuery({
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      return response.text();
    },
    queryKey: ["text-preview", url],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex size-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Failed to load preview</p>
      </div>
    );
  }

  const lines = data ? data.split("\n") : [];
  const isTruncated = lines.length > 10;
  const truncatedContent = lines.slice(0, 10).join("\n");

  return (
    <div className="relative">
      <pre className="size-full overflow-hidden p-3 font-mono text-xs text-foreground">
        {truncatedContent}
      </pre>
      {isTruncated && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 bg-linear-to-t from-background to-transparent" />
      )}
    </div>
  );
}
