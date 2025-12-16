import {
  closeFileViewerAtom,
  fileViewerAtom,
} from "@/client/atoms/file-viewer";
import { cn } from "@/client/lib/utils";
import { formatBytes } from "@quests/workspace/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAtomValue, useSetAtom } from "jotai";
import { Download, Music, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImageWithFallback } from "./image-with-fallback";
import { Button } from "./ui/button";

export function FileViewerModal() {
  const state = useAtomValue(fileViewerAtom);
  const closeViewer = useSetAtom(closeFileViewerAtom);
  const [imageErrorUrl, setImageErrorUrl] = useState<null | string>(null);

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
    state.mimeType?.startsWith("image/") && imageErrorUrl !== state.url;
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
              <div className="flex flex-col items-center gap-1 text-white">
                <p className="text-sm font-medium text-center">
                  {state.filename}
                </p>
                {typeof state.size === "number" && state.size > 0 && (
                  <p className="text-xs text-white/70">
                    {formatBytes(state.size)}
                  </p>
                )}
              </div>
              <Button
                className="bg-white/10 hover:bg-white/20 text-white"
                onClick={handleDownload}
                size="sm"
                variant="ghost"
              >
                <Download className="size-4" />
                Download
              </Button>
            </div>

            <div className="w-full h-full p-16 flex items-center justify-center">
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
                  className="w-full h-full rounded border border-white/10"
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
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center w-full max-w-md">
                  <div className="size-16 rounded-full bg-white/10 flex items-center justify-center">
                    <Download className="size-8 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Preview not available
                    </p>
                    <p className="text-xs text-white/60 mt-1">
                      Click download to save this file
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
