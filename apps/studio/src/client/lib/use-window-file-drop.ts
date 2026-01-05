import { useEffect, useRef, useState } from "react";

interface UseWindowFileDropOptions {
  onFilesDropped: (files: FileList) => void;
  onFolderDropAttempt?: () => void;
}

export const useWindowFileDrop = ({
  onFilesDropped,
  onFolderDropAttempt,
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

      let hasFolders = false;
      for (const item of items) {
        if (item.webkitGetAsEntry()?.isDirectory) {
          hasFolders = true;
          break;
        }
      }

      if (hasFolders) {
        onFolderDropAttempt?.();
        return;
      }

      onFilesDropped(files);
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
  }, [onFilesDropped, onFolderDropAttempt]);

  return { isDragging };
};
