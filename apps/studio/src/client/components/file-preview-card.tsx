import {
  type FileViewerFile,
  openFileViewerAtom,
} from "@/client/atoms/file-viewer";
import { getAssetUrl } from "@/client/lib/get-asset-url";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useSetAtom } from "jotai";
import { Play } from "lucide-react";
import { useRef, useState } from "react";

import { FileIcon } from "./file-icon";
import { FileVersionBadge } from "./file-version-badge";
import { ImageWithFallback } from "./image-with-fallback";
import { SandboxedHtmlIframe } from "./sandboxed-html-iframe";
import { Badge } from "./ui/badge";

interface FilePreviewCardProps {
  assetBaseUrl?: string;
  filename: string;
  filePath?: string;
  gallery?: FileViewerFile[];
  mimeType: string;
  previewUrl: string;
  projectSubdomain?: ProjectSubdomain;
  size?: number;
  versionRef: string;
}

export function FilePreviewCard({
  assetBaseUrl,
  filename,
  filePath,
  gallery,
  mimeType,
  previewUrl,
  projectSubdomain,
  size,
  versionRef,
}: FilePreviewCardProps) {
  const openFileViewer = useSetAtom(openFileViewerAtom);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<null | number>(null);

  const finalPreviewUrl =
    assetBaseUrl && filePath && versionRef
      ? getAssetUrl({ assetBase: assetBaseUrl, filePath, versionRef })
      : previewUrl;

  const isImage = mimeType.startsWith("image/");
  const isHtml = mimeType === "text/html";
  const isPdf = mimeType === "application/pdf";
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");

  const handlePreviewClick = () => {
    const files = gallery ?? [
      {
        filename,
        filePath,
        mimeType,
        projectSubdomain,
        size,
        url: finalPreviewUrl,
        versionRef,
      },
    ];
    const currentIndex = gallery
      ? gallery.findIndex((f) => f.url === finalPreviewUrl)
      : 0;

    openFileViewer({
      currentIndex: currentIndex === -1 ? 0 : currentIndex,
      files,
    });
  };

  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      void videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  if (isAudio) {
    return (
      <div className="group relative overflow-hidden rounded-lg border border-border bg-background @sm:col-span-2">
        <PreviewHeader
          filename={filename}
          filePath={filePath}
          mimeType={mimeType}
          projectSubdomain={projectSubdomain}
          versionRef={versionRef}
        />
        <div className="p-2">
          <audio className="w-full" controls src={finalPreviewUrl} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-border bg-background"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <PreviewHeader
        filename={filename}
        filePath={filePath}
        mimeType={mimeType}
        projectSubdomain={projectSubdomain}
        versionRef={versionRef}
      />
      <div className="relative aspect-video w-full overflow-hidden">
        {isImage && (
          <div className="flex size-full items-center justify-center">
            <ImageWithFallback
              alt={filename}
              className="max-h-full max-w-full bg-white object-contain"
              fallbackClassName="size-full"
              filename={filename}
              src={finalPreviewUrl}
            />
          </div>
        )}
        {isHtml && (
          <SandboxedHtmlIframe
            className="absolute top-0 left-0 h-[300%] w-[300%] origin-top-left border-0"
            restrictInteractive
            src={finalPreviewUrl}
            style={{ transform: "scale(0.333)" }}
            title={filename}
          />
        )}
        {isPdf && (
          <iframe
            className="absolute top-0 left-0 h-[300%] w-[300%] origin-top-left border-0"
            // cspell:ignore navpanes
            src={`${finalPreviewUrl}#toolbar=0&navpanes=0&view=Fit`}
            style={{ transform: "scale(0.333)" }}
            title={filename}
          />
        )}
        {isVideo && (
          <>
            <video
              className="size-full bg-black object-contain"
              loop
              muted
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
              src={finalPreviewUrl}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity group-hover:opacity-0">
              <div className="rounded-full bg-white/90 p-4 shadow-lg">
                <Play className="size-8 fill-black text-black" />
              </div>
            </div>
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Badge
                  className="bg-black/70 text-white hover:bg-black/70"
                  variant="secondary"
                >
                  {formatTime(timeRemaining)}
                </Badge>
              </div>
            )}
            <div className="absolute right-0 bottom-0 left-0 h-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          </>
        )}
      </div>
      <button
        className="absolute inset-0 size-full"
        onClick={handlePreviewClick}
        type="button"
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function PreviewHeader({
  filename,
  filePath,
  mimeType,
  projectSubdomain,
  versionRef,
}: {
  filename: string;
  filePath?: string;
  mimeType: string;
  projectSubdomain?: ProjectSubdomain;
  versionRef: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-2.5 py-1.5">
      <FileIcon
        className="size-4 shrink-0 text-muted-foreground"
        filename={filename}
        mimeType={mimeType}
      />
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {filename}
      </span>
      {filePath && projectSubdomain && versionRef && (
        <FileVersionBadge
          className="ml-auto shrink-0 text-[10px]"
          filePath={filePath}
          projectSubdomain={projectSubdomain}
          versionRef={versionRef}
        />
      )}
    </div>
  );
}
