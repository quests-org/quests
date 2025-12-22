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
import { useEffect, useMemo, useReducer } from "react";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { TruncatedText } from "./truncated-text";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

type ErrorAction =
  | { error: "download"; message: string; type: "SET"; url: string }
  | { error: "download" | "image" | "load"; type: "CLEAR"; url: string }
  | { error: "image" | "load"; type: "SET"; url: string }
  | { type: "RESET" };

type FileErrors = Record<
  string,
  {
    download?: string;
    image?: boolean;
    load?: boolean;
  }
>;

export function FileViewerModal() {
  const state = useAtomValue(fileViewerAtom);
  const closeViewer = useSetAtom(closeFileViewerAtom);
  const navigate = useSetAtom(navigateFileViewerAtom);
  const [fileErrors, dispatch] = useReducer(fileErrorsReducer, {});
  const router = useRouter();

  const currentFile = state.files[state.currentIndex];
  const hasMultipleFiles = state.files.length > 1;
  const currentFileErrors = currentFile
    ? fileErrors[currentFile.url]
    : undefined;

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
      dispatch({ error: "download", type: "CLEAR", url: currentFile.url });
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
          dispatch({ error: "load", type: "SET", url: currentFile.url });
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
      dispatch({ error: "load", type: "SET", url: currentFile.url });
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while downloading the file";
      dispatch({
        error: "download",
        message: `${errorMessage}\n\nFile: ${currentFile.filePath ?? currentFile.url}`,
        type: "SET",
        url: currentFile.url,
      });
    }
  };

  const hasLoadError = currentFileErrors?.load ?? false;

  const isImage =
    (currentFile.mimeType?.startsWith("image/") || !currentFile.mimeType) &&
    !currentFileErrors?.image;
  const isSvg = currentFile.mimeType === "image/svg+xml";
  const isPdf = currentFile.mimeType === "application/pdf" && !hasLoadError;
  const isVideo = currentFile.mimeType?.startsWith("video/") && !hasLoadError;
  const isAudio = currentFile.mimeType?.startsWith("audio/") && !hasLoadError;

  const handleMediaError = () => {
    dispatch({ error: "load", type: "SET", url: currentFile.url });
  };

  const handleImageError = () => {
    dispatch({ error: "image", type: "SET", url: currentFile.url });
  };

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (!open) {
          dispatch({ type: "RESET" });
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

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 py-16">
              {hasMultipleFiles && (
                <>
                  <Button
                    className="absolute top-1/2 left-4 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-white/10"
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
                    className="absolute top-1/2 right-4 z-10 -translate-y-1/2 bg-black/50 text-white hover:bg-white/10"
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
                    "h-auto max-h-full w-auto max-w-full object-contain",
                    isSvg && "rounded bg-white/90 p-4",
                  )}
                  fallbackClassName="size-32 rounded-lg"
                  filename={currentFile.filename}
                  key={currentFile.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onError={handleImageError}
                  src={currentFile.url}
                />
              ) : isPdf ? (
                <iframe
                  className="h-full max-h-full w-full max-w-full rounded border border-white/10"
                  key={currentFile.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onError={handleMediaError}
                  src={currentFile.url}
                  title={currentFile.filename}
                />
              ) : isVideo ? (
                <video
                  className="max-h-full max-w-full rounded border border-white/10"
                  controls
                  key={currentFile.url}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onError={handleMediaError}
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
                  onError={handleMediaError}
                  src={currentFile.url}
                />
              ) : (
                <div
                  className="flex w-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="flex size-32 items-center justify-center rounded-lg bg-background">
                    <FileIcon
                      className="size-16"
                      filename={currentFile.filename}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Preview not available
                    </p>
                    <p className="mt-1 text-xs text-white/60">
                      Use the download button below to save this file
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div
              className="flex shrink-0 flex-col items-center gap-4 px-4 pb-8"
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
                          ? "scale-125 bg-white"
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
              <div className="flex w-full max-w-full flex-col items-center gap-3 text-white">
                <TruncatedText
                  className="px-4 text-center text-sm font-medium"
                  maxLength={50}
                >
                  {currentFile.filename}
                </TruncatedText>
                {currentFileErrors?.download && (
                  <Alert className="w-full max-w-2xl" variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Failed to download file</AlertTitle>
                    <AlertDescription className="whitespace-pre-line">
                      {currentFileErrors.download}
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

function fileErrorsReducer(
  errors: FileErrors,
  action: ErrorAction,
): FileErrors {
  switch (action.type) {
    case "CLEAR": {
      const { [action.error]: _, ...rest } = errors[action.url] ?? {};
      if (Object.keys(rest).length === 0) {
        const { [action.url]: __, ...remaining } = errors;
        return remaining;
      }
      return { ...errors, [action.url]: rest };
    }
    case "RESET": {
      return {};
    }
    case "SET": {
      return {
        ...errors,
        [action.url]: {
          ...errors[action.url],
          [action.error]: action.error === "download" ? action.message : true,
        },
      };
    }
    default: {
      return errors;
    }
  }
}
