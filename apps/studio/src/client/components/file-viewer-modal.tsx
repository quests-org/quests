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
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AudioViewer } from "./audio-viewer";
import { FilePreviewFallback } from "./file-preview-fallback";
import { ImageWithFallback } from "./image-with-fallback";
import { PdfViewer } from "./pdf-viewer";
import { TextFileViewer } from "./text-file-viewer";
import { TruncatedText } from "./truncated-text";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { VideoViewer } from "./video-viewer";

export function FileViewerModal() {
  const state = useAtomValue(fileViewerAtom);
  const closeViewer = useSetAtom(closeFileViewerAtom);
  const navigate = useSetAtom(navigateFileViewerAtom);
  const [downloadError, setDownloadError] = useState<
    undefined | { message: string; url: string }
  >(undefined);
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
      setDownloadError(undefined);
      if (currentFile.url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = currentFile.url;
        link.download = currentFile.filename;
        document.body.append(link);
        link.click();
        link.remove();
      } else {
        const response = await fetch(currentFile.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
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
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while downloading the file";
      setDownloadError({
        message: `${errorMessage}\n\nFile: ${currentFile.filePath ?? currentFile.url}`,
        url: currentFile.url,
      });
    }
  };

  const isPlaintext = currentFile.mimeType === "text/plain";
  const isImage =
    currentFile.mimeType?.startsWith("image/") || !currentFile.mimeType;
  const isPdf = currentFile.mimeType === "application/pdf";
  const isVideo = currentFile.mimeType?.startsWith("video/");
  const isAudio = currentFile.mimeType?.startsWith("audio/");

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (!open) {
          closeViewer();
        }
      }}
      open={state.isOpen}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <DialogPrimitive.Title className="sr-only">
            {currentFile.filename}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            File viewer
          </DialogPrimitive.Description>
          <div
            className="relative flex h-full w-full flex-col"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeViewer();
              }
            }}
          >
            <Button
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
              onClick={() => {
                closeViewer();
              }}
              size="icon"
              variant="ghost"
            >
              <X className="size-5" />
            </Button>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-16 py-16"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closeViewer();
                }
              }}
            >
              {hasMultipleFiles && (
                <>
                  <Button
                    className="absolute top-1/2 left-4 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-white/10"
                    onClick={() => {
                      navigate("prev");
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <ChevronLeft className="size-6" />
                  </Button>
                  <Button
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-white/10"
                    onClick={() => {
                      navigate("next");
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <ChevronRight className="size-6" />
                  </Button>
                </>
              )}
              <div
                className="flex size-full items-center justify-center"
                key={currentFile.url}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    closeViewer();
                  }
                }}
              >
                {isPlaintext ? (
                  <TextFileViewer
                    filename={currentFile.filename}
                    mimeType={currentFile.mimeType}
                    onBackgroundClick={closeViewer}
                    url={currentFile.url}
                  />
                ) : isImage ? (
                  <ImageWithFallback
                    alt={currentFile.filename}
                    className="h-auto max-h-full w-auto max-w-full rounded bg-white/90 object-contain p-4"
                    fallbackClassName="size-32 rounded-lg"
                    filename={currentFile.filename}
                    mimeType={currentFile.mimeType}
                    onClick={closeViewer}
                    src={currentFile.url}
                  />
                ) : isPdf ? (
                  <PdfViewer
                    filename={currentFile.filename}
                    url={currentFile.url}
                  />
                ) : isVideo ? (
                  <VideoViewer
                    filename={currentFile.filename}
                    url={currentFile.url}
                  />
                ) : isAudio ? (
                  <AudioViewer
                    filename={currentFile.filename}
                    url={currentFile.url}
                  />
                ) : (
                  <FilePreviewFallback
                    filename={currentFile.filename}
                    mimeType={currentFile.mimeType}
                  />
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-center gap-4 px-4 pb-8">
              {hasMultipleFiles && (
                <div className="flex items-center gap-1.5 py-2">
                  {state.files.map((_, index) => (
                    <button
                      className={cn(
                        "size-1.5 rounded-full transition-all",
                        index === state.currentIndex
                          ? "scale-125 bg-white"
                          : "bg-white/30 hover:bg-white/50",
                      )}
                      key={index}
                      onClick={() => {
                        navigate(index);
                      }}
                      type="button"
                    />
                  ))}
                </div>
              )}
              <div className="flex w-full max-w-full flex-col items-center gap-3 text-white">
                <TruncatedText
                  className="px-4 text-center text-sm font-medium"
                  maxLength={50}
                >
                  {currentFile.filename}
                </TruncatedText>
                {downloadError?.url === currentFile.url && (
                  <Alert className="w-full max-w-2xl" variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Failed to download file</AlertTitle>
                    <AlertDescription className="whitespace-pre-line">
                      {downloadError.message}
                    </AlertDescription>
                  </Alert>
                )}
                {isDownloadable && (
                  <Button
                    className="bg-white/10 text-white hover:bg-white/20"
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
