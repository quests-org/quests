import { useEffect, useRef, useState } from "react";

export interface DroppedFolder {
  path: string;
  type: "folder";
}

interface UseWindowFileDropOptions {
  onFilesDropped: (files: FileList) => void;
  onFoldersDropped?: (folders: DroppedFolder[]) => void;
}

export const useWindowFileDrop = ({
  onFilesDropped,
  onFoldersDropped,
}: UseWindowFileDropOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      if (!e.dataTransfer) {
        return;
      }

      const items = [...e.dataTransfer.items];
      const files = e.dataTransfer.files;

      const folderItems = items.filter(
        (item) => item.webkitGetAsEntry()?.isDirectory,
      );

      const fileItems = items.filter(
        (item) => !item.webkitGetAsEntry()?.isDirectory,
      );

      if (folderItems.length > 0) {
        const folders: DroppedFolder[] = [];

        for (const folderItem of folderItems) {
          if (folderItem.kind === "file") {
            const file = folderItem.getAsFile();
            if (file) {
              const path = window.api.getFilePath(file);
              if (path) {
                folders.push({ path, type: "folder" });
              }
            }
          }
        }

        if (folders.length > 0) {
          onFoldersDropped?.(folders);
        } else {
          // eslint-disable-next-line no-console
          console.error("Could not get folder paths from dropped items");
        }
      }

      if (fileItems.length > 0 && files.length > 0) {
        onFilesDropped(files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [onFilesDropped, onFoldersDropped]);

  return { isDragging };
};
