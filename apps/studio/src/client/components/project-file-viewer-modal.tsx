import {
  closeProjectFileViewerAtom,
  collapseProjectFileViewerAtom,
  projectFileViewerAtom,
  setProjectFileViewerIndexAtom,
} from "@/client/atoms/project-file-viewer";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect } from "react";

import { FilePreviewListItem } from "./file-preview-list-item";
import { ProjectFileViewer } from "./project-file-viewer";
import { Button } from "./ui/button";

export function ProjectFileViewerModal() {
  const state = useAtomValue(projectFileViewerAtom);
  const closeViewer = useSetAtom(closeProjectFileViewerAtom);
  const collapseViewer = useSetAtom(collapseProjectFileViewerAtom);
  const setCurrentIndex = useSetAtom(setProjectFileViewerIndexAtom);
  const router = useRouter();

  const currentFile = state.files[state.currentIndex];
  const hasMultipleFiles = state.files.length > 1;

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
          collapseViewer();
        }
      }}
      open={state.isOpen && state.mode === "modal"}
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
            className="relative flex size-full flex-col"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                collapseViewer();
              }
            }}
          >
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center p-16"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  collapseViewer();
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
              >
                <ProjectFileViewer
                  file={currentFile}
                  onClose={collapseViewer}
                />
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
