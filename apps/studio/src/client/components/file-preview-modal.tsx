import {
  closeFilePreviewAtom,
  filePreviewAtom,
} from "@/client/atoms/file-preview";
import { getFileType } from "@/client/lib/get-file-type";
import { formatBytes } from "@quests/workspace/client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "@tanstack/react-router";
import { useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { useEffect } from "react";

import { FileIcon } from "./file-icon";
import { ImageWithFallback } from "./image-with-fallback";
import { Button } from "./ui/button";

export function FilePreviewModal() {
  const state = useAtomValue(filePreviewAtom);
  const closePreview = useSetAtom(closeFilePreviewAtom);
  const router = useRouter();

  const { file } = state;

  useEffect(() => {
    const unsubscribe = router.subscribe("onBeforeLoad", () => {
      if (state.isOpen) {
        closePreview();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router, state.isOpen, closePreview]);

  if (!file?.url) {
    return null;
  }

  const fileType = getFileType(file);
  const hasExtension = file.filename.includes(".");
  const isImage = fileType === "image" || (!file.mimeType && !hasExtension);

  return (
    <DialogPrimitive.Root
      onOpenChange={(open) => {
        if (!open) {
          closePreview();
        }
      }}
      open={state.isOpen}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <DialogPrimitive.Title className="sr-only">
            {file.filename}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            File preview
          </DialogPrimitive.Description>
          <div
            className="relative flex h-full w-full flex-col"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closePreview();
              }
            }}
          >
            <div className="absolute top-4 right-4 left-4 z-10 flex items-center justify-center gap-2 text-white">
              <div className="flex items-center gap-2 rounded bg-black/50 px-3 py-1.5">
                <FileIcon
                  className="size-4 shrink-0"
                  filename={file.filename}
                />
                <span className="truncate text-xs">{file.filename}</span>
                {/* eslint-disable-next-line unicorn/explicit-length-check */}
                {file.size && (
                  <span className="text-xs text-white/60">
                    {formatBytes(file.size)}
                  </span>
                )}
              </div>
              <div className="absolute right-0 flex items-center gap-1">
                <Button
                  className="text-white hover:bg-white/10"
                  onClick={closePreview}
                  size="sm"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center px-16 py-16"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  closePreview();
                }
              }}
            >
              <div
                className="flex size-full items-center justify-center"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    closePreview();
                  }
                }}
              >
                {isImage ? (
                  <ImageWithFallback
                    alt={file.filename}
                    className="h-auto max-h-full w-auto max-w-full rounded object-contain"
                    fallback={
                      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
                        <div className="flex size-32 items-center justify-center rounded-lg bg-background">
                          <FileIcon
                            className="size-16"
                            fallbackExtension="jpg"
                            filename={file.filename}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            Failed to load image
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            The image could not be displayed
                          </p>
                        </div>
                      </div>
                    }
                    fallbackClassName="size-32 rounded-lg"
                    filename={file.filename}
                    onClick={closePreview}
                    showCheckerboard
                    src={file.url}
                  />
                ) : (
                  <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="flex size-32 items-center justify-center rounded-lg bg-background">
                      <FileIcon className="size-16" filename={file.filename} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {file.filename}
                      </p>
                      {/* eslint-disable-next-line unicorn/explicit-length-check */}
                      {file.size && (
                        <p className="mt-1 text-xs text-white/60">
                          {formatBytes(file.size)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
