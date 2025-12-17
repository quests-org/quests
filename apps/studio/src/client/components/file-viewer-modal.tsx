import {
  closeFileViewerAtom,
  fileViewerAtom,
  navigateFileViewerAtom,
} from "@/client/atoms/file-viewer";
import { cn } from "@/client/lib/utils";
import { formatBytes } from "@quests/workspace/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { TruncatedText } from "./truncated-text";
import { Button } from "./ui/button";

export function FileViewerModal() {
  const state = useAtomValue(fileViewerAtom);
  const closeViewer = useSetAtom(closeFileViewerAtom);
  const navigate = useSetAtom(navigateFileViewerAtom);
  const [imageErrorUrl, setImageErrorUrl] = useState<null | string>(null);
  const router = useRouter();

  const currentFile = state.files[state.currentIndex];
  const hasMultipleFiles = state.files.length > 1;

  const isDownloadable = useMemo(() => {
    // We can't assume a file is downloadable via fetch due to CORS restrictions
    if (!currentFile) {
      return false;
    }

    if (currentFile.url.startsWith("data:")) {
      return true;
    }

    try {
      const url = new URL(currentFile.url);
      return (
        url.hostname === "localhost" || url.hostname.endsWith(".localhost")
      );
    } catch {
      return false;
    }
  }, [currentFile]);

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

  useEffect(() => {
    if (!state.isOpen || !hasMultipleFiles) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        navigate("prev");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        navigate("next");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state.isOpen, hasMultipleFiles, navigate]);

  if (!currentFile) {
    return null;
  }

  const handleDownload = async () => {
    try {
      if (currentFile.url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = currentFile.url;
        link.download = currentFile.filename;
        document.body.append(link);
        link.click();
        link.remove();
      } else {
        const response = await fetch(currentFile.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = currentFile.filename;
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
    (currentFile.mimeType?.startsWith("image/") || !currentFile.mimeType) &&
    imageErrorUrl !== currentFile.url;
  const isSvg = currentFile.mimeType === "image/svg+xml";
  const isPdf = currentFile.mimeType === "application/pdf";
  const isVideo = currentFile.mimeType?.startsWith("video/");
  const isAudio = currentFile.mimeType?.startsWith("audio/");

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
            {currentFile.filename}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            File viewer
          </DialogPrimitive.Description>
          <div
            className="relative w-full h-full flex flex-col"
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

            <div className="flex-1 min-h-0 px-16 py-16 flex items-center justify-center relative">
              {hasMultipleFiles && (
                <>
                  <Button
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 bg-black/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("prev");
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <ChevronLeft className="size-6" />
                  </Button>
                  <Button
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 bg-black/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("next");
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <ChevronRight className="size-6" />
                  </Button>
                </>
              )}
              {isImage ? (
                <ImageWithFallback
                  alt={currentFile.filename}
                  className={cn(
                    "max-w-full max-h-full w-auto h-auto object-contain",
                    isSvg && "bg-white/90 rounded p-4",
                  )}
                  fallbackClassName="size-32 rounded-lg"
                  filename={currentFile.filename}
                  key={currentFile.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onError={() => {
                    setImageErrorUrl(currentFile.url);
                  }}
                  src={currentFile.url}
                />
              ) : isPdf ? (
                <iframe
                  className="max-w-full max-h-full w-full h-full rounded border border-white/10"
                  key={currentFile.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  src={currentFile.url}
                  title={currentFile.filename}
                />
              ) : isVideo ? (
                <video
                  className="max-w-full max-h-full rounded border border-white/10"
                  controls
                  key={currentFile.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  src={currentFile.url}
                />
              ) : isAudio ? (
                <audio
                  className="w-full max-w-2xl"
                  controls
                  key={currentFile.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  src={currentFile.url}
                />
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-4 p-8 text-center w-full max-w-md"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="size-32 rounded-lg bg-background flex items-center justify-center">
                    <FileIcon
                      className="size-16"
                      filename={currentFile.filename}
                    />
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

            <div
              className="shrink-0 flex flex-col items-center gap-4 px-4 pb-8"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {hasMultipleFiles && (
                <div className="flex items-center gap-1.5 py-2">
                  {state.files.map((_, index) => (
                    <button
                      className={cn(
                        "size-1.5 rounded-full transition-all",
                        index === state.currentIndex
                          ? "bg-white scale-125"
                          : "bg-white/30 hover:bg-white/50",
                      )}
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(index);
                      }}
                      type="button"
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-col items-center gap-3 text-white max-w-full">
                <TruncatedText
                  className="text-sm font-medium text-center px-4"
                  maxLength={50}
                >
                  {currentFile.filename}
                </TruncatedText>
                {isDownloadable && (
                  <Button
                    className="bg-white/10 hover:bg-white/20 text-white"
                    onClick={handleDownload}
                    size="sm"
                    variant="ghost"
                  >
                    <Download className="size-4" />
                    Download
                    {typeof currentFile.size === "number" &&
                      currentFile.size > 0 && (
                        <span className="text-white/60">
                          ({formatBytes(currentFile.size)})
                        </span>
                      )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
