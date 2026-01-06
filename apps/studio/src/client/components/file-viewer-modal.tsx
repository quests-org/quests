import {
  closeFileViewerAtom,
  fileViewerAtom,
  navigateFileViewerAtom,
} from "@/client/atoms/file-viewer";
import { formatBytes } from "@quests/workspace/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { FileActionsMenu } from "./file-actions-menu";
import { FileIcon } from "./file-icon";
import { FileThumbnail } from "./file-thumbnail";
import { FileVersionBadge } from "./file-version-badge";
import { FileViewer } from "./file-viewer";
import { ImageWithFallback } from "./image-with-fallback";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function FileViewerModal() {
  const state = useAtomValue(fileViewerAtom);
  const closeViewer = useSetAtom(closeFileViewerAtom);
  const navigate = useSetAtom(navigateFileViewerAtom);
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

  useEffect(() => {
    if (!state.isOpen || !hasMultipleFiles) {
      return;
    }

    const thumbnail = document.querySelector(
      `#thumbnail-${state.currentIndex}`,
    );
    if (thumbnail) {
      thumbnail.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [state.currentIndex, state.isOpen, hasMultipleFiles]);

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
      toast.error("Failed to download file", {
        closeButton: true,
        description: `${errorMessage}\n\nFile: ${currentFile.filePath ?? currentFile.url}`,
        duration: 10_000,
        richColors: true,
      });
    }
  };

  const handleCopyImage = async () => {
    try {
      const response = await fetch(currentFile.url);
      const blob = await response.blob();

      if (blob.type.includes("svg") || blob.type.includes("xml")) {
        const text = await blob.text();
        await navigator.clipboard.writeText(text);
      } else {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
        } catch {
          const text = await blob.text();
          await navigator.clipboard.writeText(text);
        }
      }
    } catch {
      toast.error("Failed to copy image", {
        closeButton: true,
        description: "The image could not be copied to clipboard",
        duration: 5000,
        richColors: true,
      });
    }
  };

  const hasExtension = currentFile.filename.includes(".");
  const isImage =
    currentFile.mimeType?.startsWith("image/") ||
    (!currentFile.mimeType && !hasExtension);

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
            {isImage && (
              <div className="absolute top-4 right-4 left-4 z-10 flex items-center justify-center gap-2 text-white">
                <div className="flex items-center gap-2 rounded bg-black/50 px-3 py-1.5">
                  <FileIcon
                    className="size-4 shrink-0"
                    filename={currentFile.filename}
                    mimeType={currentFile.mimeType}
                  />
                  <span className="truncate text-xs">
                    {currentFile.filePath ?? currentFile.filename}
                  </span>
                  {currentFile.filePath &&
                    currentFile.projectSubdomain &&
                    currentFile.versionRef && (
                      <FileVersionBadge
                        className="bg-white/10 text-white hover:bg-white/20"
                        filePath={currentFile.filePath}
                        projectSubdomain={currentFile.projectSubdomain}
                        versionRef={currentFile.versionRef}
                      />
                    )}
                </div>
                <div className="absolute right-0 flex items-center gap-1">
                  {isDownloadable && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="text-white hover:bg-white/10"
                          onClick={handleDownload}
                          size="sm"
                          tabIndex={-1}
                          variant="ghost"
                        >
                          <Download className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Download
                          {typeof currentFile.size === "number" &&
                            currentFile.size > 0 &&
                            ` (${formatBytes(currentFile.size)})`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <FileActionsMenu
                    filePath={currentFile.filePath}
                    onCopy={isDownloadable ? handleCopyImage : undefined}
                    projectSubdomain={currentFile.projectSubdomain}
                  />
                  <Button
                    className="text-white hover:bg-white/10"
                    onClick={() => {
                      closeViewer();
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            )}

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
                {isImage ? (
                  <ImageWithFallback
                    alt={currentFile.filename}
                    className="h-auto max-h-full w-auto max-w-full rounded bg-white/90 object-contain p-4"
                    fallback={
                      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
                        <div className="flex size-32 items-center justify-center rounded-lg bg-background">
                          <FileIcon
                            className="size-16"
                            filename={currentFile.filename}
                            mimeType={currentFile.mimeType}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            Failed to load image
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            The image could not be displayed
                            {isDownloadable &&
                              " — try downloading it to view locally"}
                          </p>
                        </div>
                      </div>
                    }
                    fallbackClassName="size-32 rounded-lg"
                    filename={currentFile.filename}
                    mimeType={currentFile.mimeType}
                    onClick={closeViewer}
                    src={currentFile.url}
                  />
                ) : (
                  <FileViewer
                    filename={currentFile.filename}
                    filePath={currentFile.filePath}
                    fileSize={currentFile.size}
                    mimeType={currentFile.mimeType}
                    onClose={closeViewer}
                    onDownload={isDownloadable ? handleDownload : undefined}
                    projectSubdomain={currentFile.projectSubdomain}
                    url={currentFile.url}
                    versionRef={currentFile.versionRef}
                  />
                )}
              </div>
            </div>

            {hasMultipleFiles && (
              <div className="flex shrink-0 justify-center px-4 pb-8">
                <div className="flex gap-x-2 overflow-x-auto px-1 py-2">
                  {state.files.map((file, index) => (
                    <div
                      className="max-w-48 shrink-0"
                      id={`thumbnail-${index}`}
                      key={index}
                    >
                      <FileThumbnail
                        filename={file.filename}
                        filePath={file.filePath}
                        isSelected={index === state.currentIndex}
                        mimeType={file.mimeType}
                        onClick={() => {
                          navigate(index);
                        }}
                        previewUrl={file.url}
                        projectSubdomain={file.projectSubdomain}
                        size={file.size}
                        versionRef={file.versionRef}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
