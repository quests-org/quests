import {
  closeProjectFileViewerAtom,
  projectFileViewerAtom,
  setProjectFileViewerIndexAtom,
} from "@/client/atoms/project-file-viewer";
import {
  copyFileToClipboard,
  downloadFile,
  isFileDownloadable,
} from "@/client/lib/file-actions";
import { getFileType } from "@/client/lib/get-file-type";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect } from "react";

import { cn } from "../lib/utils";
import { FileActionsMenu } from "./file-actions-menu";
import { FileIcon } from "./file-icon";
import { FilePreviewFallback } from "./file-preview-fallback";
import { FilePreviewListItem } from "./file-preview-list-item";
import { FileVersionBadge } from "./file-version-badge";
import { FileViewer } from "./file-viewer";
import { ImageWithFallback } from "./image-with-fallback";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ProjectFileViewerModal() {
  const state = useAtomValue(projectFileViewerAtom);
  const closeViewer = useSetAtom(closeProjectFileViewerAtom);
  const setCurrentIndex = useSetAtom(setProjectFileViewerIndexAtom);
  const router = useRouter();

  const currentFile = state.files[state.currentIndex];
  const hasMultipleFiles = state.files.length > 1;

  const isDownloadable = currentFile
    ? isFileDownloadable(currentFile.url)
    : false;
  const fileType = currentFile ? getFileType(currentFile) : null;
  const isImage = fileType === "image";

  const handleDownload = async () => {
    if (!currentFile?.projectSubdomain || !currentFile.filePath) {
      return;
    }
    await downloadFile(currentFile);
  };

  const handleCopy = async () => {
    if (!currentFile) {
      return;
    }
    await copyFileToClipboard({ url: currentFile.url });
  };

  const goToPrevious = useCallback(() => {
    const newIndex =
      state.currentIndex === 0
        ? state.files.length - 1
        : state.currentIndex - 1;
    setCurrentIndex(newIndex);
  }, [state.currentIndex, state.files.length, setCurrentIndex]);

  const goToNext = useCallback(() => {
    const newIndex = (state.currentIndex + 1) % state.files.length;
    setCurrentIndex(newIndex);
  }, [state.currentIndex, state.files.length, setCurrentIndex]);

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
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    state.isOpen,
    hasMultipleFiles,
    state.files.length,
    state.currentIndex,
    setCurrentIndex,
    goToPrevious,
    goToNext,
  ]);

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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
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
              <div className="dark absolute top-4 right-4 left-4 z-10 flex items-center justify-center gap-2 text-foreground">
                <div className="flex items-center gap-2">
                  <FileIcon
                    className="size-4 shrink-0"
                    filename={currentFile.filename}
                    mimeType={currentFile.mimeType}
                  />
                  <span className="truncate text-xs">
                    {currentFile.filePath}
                  </span>
                  <FileVersionBadge
                    filePath={currentFile.filePath}
                    projectSubdomain={currentFile.projectSubdomain}
                    versionRef={currentFile.versionRef}
                  />
                </div>
                <div className="absolute right-0 flex items-center gap-1">
                  {isDownloadable && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleDownload}
                          size="sm"
                          tabIndex={-1}
                          variant="ghost-overlay"
                        >
                          <Download className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {currentFile.projectSubdomain && currentFile.filePath && (
                    <FileActionsMenu
                      filePath={currentFile.filePath}
                      onCopy={isDownloadable ? handleCopy : undefined}
                      projectSubdomain={currentFile.projectSubdomain}
                      variant="ghost-overlay"
                      versionRef={currentFile.versionRef}
                    />
                  )}
                  <Button
                    onClick={() => {
                      closeViewer();
                    }}
                    size="sm"
                    variant="ghost-overlay"
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
                    className="absolute top-1/2 left-4 z-10 -translate-y-1/2"
                    onClick={goToPrevious}
                    size="icon"
                    variant="ghost-overlay"
                  >
                    <ChevronLeft className="size-6" />
                  </Button>
                  <Button
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2"
                    onClick={goToNext}
                    size="icon"
                    variant="ghost-overlay"
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
                    className="h-auto max-h-full w-auto max-w-full rounded object-contain select-none"
                    fallback={
                      <FilePreviewFallback
                        fallbackExtension="jpg"
                        filename={currentFile.filename}
                        onDownload={isDownloadable ? handleDownload : undefined}
                      />
                    }
                    fallbackClassName="size-32 rounded-lg"
                    filename={currentFile.filename}
                    onClick={closeViewer}
                    showCheckerboard
                    src={currentFile.url}
                  />
                ) : (
                  <FileViewer
                    file={currentFile}
                    onClose={closeViewer}
                    onDownload={isDownloadable ? handleDownload : undefined}
                  />
                )}
              </div>
            </div>

            {hasMultipleFiles && (
              <div className="dark flex shrink-0 justify-center px-4 pb-8 text-foreground">
                <div className="flex gap-x-2 overflow-x-auto px-1 py-2">
                  {state.files.map((file, index) => (
                    <div
                      className="max-w-48 shrink-0"
                      id={`thumbnail-${index}`}
                      key={index}
                    >
                      <FilePreviewListItem
                        file={file}
                        isSelected={index === state.currentIndex}
                        onClick={() => {
                          setCurrentIndex(index);
                        }}
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
