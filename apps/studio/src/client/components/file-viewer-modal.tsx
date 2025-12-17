import {
  closeFileViewerAtom,
  fileViewerAtom,
} from "@/client/atoms/file-viewer";
import { cn } from "@/client/lib/utils";
import { formatBytes } from "@quests/workspace/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { Download, Music, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function FileViewerModal() {
  const state = useAtomValue(fileViewerAtom);
  const closeViewer = useSetAtom(closeFileViewerAtom);
  const [imageErrorUrl, setImageErrorUrl] = useState<null | string>(null);
  const router = useRouter();

  const truncatedFilename = useMemo(
    () => truncateMiddle(state.filename, 50),
    [state.filename],
  );

  const isFilenameTruncated = state.filename.length > 50;

  // Only allow downloads for localhost URLs (including subdomains) and base64 data URLs,
  // as external URLs may not support CORS, causing download attempts to fail
  const isDownloadable = useMemo(() => {
    if (state.url.startsWith("data:")) {
      return true;
    }

    try {
      const url = new URL(state.url);
      return (
        url.hostname === "localhost" || url.hostname.endsWith(".localhost")
      );
    } catch {
      return false;
    }
  }, [state.url]);

  useEffect(() => {
    const unsubscribe = router.subscribe("onBeforeLoad", () => {
      if (state.isOpen) {
        closeViewer();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router, state.isOpen, closeViewer]);

  // Happens when we are being dismissed, avoids zero state flicker
  if (!state.url || !state.filename) {
    return null;
  }

  const handleDownload = async () => {
    try {
      if (state.url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = state.url;
        link.download = state.filename;
        document.body.append(link);
        link.click();
        link.remove();
      } else {
        const response = await fetch(state.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = state.filename;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error("Failed to download file", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const isImage =
    (state.mimeType?.startsWith("image/") || !state.mimeType) &&
    imageErrorUrl !== state.url;
  const isSvg = state.mimeType === "image/svg+xml";
  const isPdf = state.mimeType === "application/pdf";
  const isVideo = state.mimeType?.startsWith("video/");
  const isAudio = state.mimeType?.startsWith("audio/");

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (open) {
          setImageErrorUrl(null);
        } else {
          setImageErrorUrl(null);
          closeViewer();
        }
      }}
      open={state.isOpen}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <DialogPrimitive.Title className="sr-only">
            {state.filename}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            File viewer
          </DialogPrimitive.Description>
          <div
            className="relative flex items-center justify-center w-full h-full"
            onClick={() => {
              closeViewer();
            }}
          >
            <Button
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                closeViewer();
              }}
              size="icon"
              variant="ghost"
            >
              <X className="size-5" />
            </Button>

            <div
              className="absolute bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-3 px-4"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="flex flex-col items-center gap-1 text-white max-w-full">
                {isFilenameTruncated ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm font-medium text-center px-4">
                        {truncatedFilename}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md wrap-break-word">
                      <p>{state.filename}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <p className="text-sm font-medium text-center px-4">
                    {state.filename}
                  </p>
                )}
                {typeof state.size === "number" && state.size > 0 && (
                  <p className="text-xs text-white/70">
                    {formatBytes(state.size)}
                  </p>
                )}
              </div>
              {isDownloadable && (
                <Button
                  className="bg-white/10 hover:bg-white/20 text-white"
                  onClick={handleDownload}
                  size="sm"
                  variant="ghost"
                >
                  <Download className="size-4" />
                  Download
                </Button>
              )}
            </div>

            <div className="w-full h-full p-16 pb-32 flex items-center justify-center">
              {isImage ? (
                <ImageWithFallback
                  alt={state.filename}
                  className={cn(
                    "max-w-full max-h-full w-auto h-auto object-contain",
                    isSvg && "bg-white/90 rounded p-4",
                  )}
                  fallbackClassName="size-32 rounded-lg"
                  filename={state.filename}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onError={() => {
                    setImageErrorUrl(state.url);
                  }}
                  src={state.url}
                />
              ) : isPdf ? (
                <iframe
                  className="max-w-full max-h-full w-full h-full rounded border border-white/10"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  src={state.url}
                  title={state.filename}
                />
              ) : isVideo ? (
                <video
                  className="max-w-full max-h-full rounded border border-white/10"
                  controls
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  src={state.url}
                />
              ) : isAudio ? (
                <div
                  className="flex flex-col items-center gap-4 p-8 w-full max-w-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="size-24 rounded-full bg-white/10 flex items-center justify-center">
                    <Music className="size-12 text-white" />
                  </div>
                  <audio className="w-full" controls src={state.url} />
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-4 p-8 text-center w-full max-w-md"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="size-32 rounded-lg bg-background flex items-center justify-center">
                    <FileIcon className="size-16" filename={state.filename} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Preview not available
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      Use the download button below to save this file
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function truncateMiddle(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  const ellipsis = "…";
  const charsToShow = maxLength - ellipsis.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return (
    str.slice(0, frontChars) + ellipsis + str.slice(str.length - backChars)
  );
}
