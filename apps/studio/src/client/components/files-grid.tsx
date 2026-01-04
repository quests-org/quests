import { type FileViewerFile } from "@/client/atoms/file-viewer";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMemo } from "react";

import { AttachmentItem } from "./attachment-item";

export interface FileItem {
  filename: string;
  filePath: string;
  mimeType: string;
  previewUrl: string;
  projectSubdomain?: ProjectSubdomain;
  size?: number;
}

interface FilesGridProps {
  files: FileItem[];
}

export function FilesGrid({ files }: FilesGridProps) {
  const { htmlFiles, imageFiles, otherFiles, pdfFiles } = useMemo(() => {
    const categorized: {
      htmlFiles: FileItem[];
      imageFiles: FileItem[];
      otherFiles: FileItem[];
      pdfFiles: FileItem[];
    } = {
      htmlFiles: [],
      imageFiles: [],
      otherFiles: [],
      pdfFiles: [],
    };

    for (const file of files) {
      if (file.mimeType === "text/html") {
        categorized.htmlFiles.push(file);
      } else if (file.mimeType.startsWith("image/")) {
        categorized.imageFiles.push(file);
      } else if (file.mimeType === "application/pdf") {
        categorized.pdfFiles.push(file);
      } else {
        categorized.otherFiles.push(file);
      }
    }

    return categorized;
  }, [files]);

  const allFiles: FileViewerFile[] = useMemo(
    () =>
      files.map((f) => ({
        filename: f.filename,
        filePath: f.filePath,
        mimeType: f.mimeType,
        projectSubdomain: f.projectSubdomain,
        size: f.size,
        url: f.previewUrl,
      })),
    [files],
  );

  return (
    <div className="flex flex-col gap-2">
      {htmlFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {htmlFiles.map((file) => (
            <AttachmentItem
              filename={file.filename}
              filePath={file.filePath}
              gallery={allFiles}
              imageClassName="h-auto w-full"
              key={file.filePath}
              mimeType={file.mimeType}
              previewUrl={file.previewUrl}
              showHtmlIframe
              size={file.size}
            />
          ))}
        </div>
      )}

      {imageFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {imageFiles.map((file) => (
            <AttachmentItem
              filename={file.filename}
              filePath={file.filePath}
              gallery={allFiles}
              imageClassName="aspect-square h-auto w-full object-contain"
              key={file.filePath}
              mimeType={file.mimeType}
              previewUrl={file.previewUrl}
              size={file.size}
            />
          ))}
        </div>
      )}

      {pdfFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {pdfFiles.map((file) => (
            <AttachmentItem
              filename={file.filename}
              filePath={file.filePath}
              gallery={allFiles}
              imageClassName="h-auto w-full"
              key={file.filePath}
              mimeType={file.mimeType}
              previewUrl={file.previewUrl}
              showPdfIframe
              size={file.size}
            />
          ))}
        </div>
      )}

      {otherFiles.length > 0 && (
        <div className="flex flex-wrap items-start gap-2">
          {otherFiles.map((file) => (
            <div className="h-12 min-w-0" key={file.filePath}>
              <AttachmentItem
                filename={file.filename}
                filePath={file.filePath}
                gallery={allFiles}
                mimeType={file.mimeType}
                previewUrl={file.previewUrl}
                size={file.size}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
