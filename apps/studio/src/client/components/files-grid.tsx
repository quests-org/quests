import { type FileViewerFile } from "@/client/atoms/file-viewer";
import { type ProjectSubdomain } from "@quests/workspace/client";

import { AttachmentItem } from "./attachment-item";
import { FilePreviewCard } from "./file-preview-card";

export interface FileItem {
  filename: string;
  filePath: string;
  mimeType: string;
  previewUrl: string;
  projectSubdomain?: ProjectSubdomain;
  size?: number;
  versionRef: string;
}

interface FilesGridProps {
  files: FileItem[];
}

export function FilesGrid({ files }: FilesGridProps) {
  const allFiles: FileViewerFile[] = files.map((f) => ({
    filename: f.filename,
    filePath: f.filePath,
    mimeType: f.mimeType,
    projectSubdomain: f.projectSubdomain,
    size: f.size,
    url: f.previewUrl,
    versionRef: f.versionRef,
  }));

  const richPreviewFiles: FileItem[] = [];
  const otherFiles: FileItem[] = [];

  for (const file of files) {
    const isImage = file.mimeType.startsWith("image/");
    const isHtml = file.mimeType === "text/html";
    const isPdf = file.mimeType === "application/pdf";
    const isVideo = file.mimeType.startsWith("video/");
    const isAudio = file.mimeType.startsWith("audio/");
    const isMarkdown = file.mimeType === "text/markdown";

    if (isImage || isHtml || isPdf || isVideo || isAudio || isMarkdown) {
      richPreviewFiles.push(file);
    } else {
      otherFiles.push(file);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {richPreviewFiles.length > 0 && (
        <div className="@container">
          <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-3">
            {richPreviewFiles.map((file) => (
              <FilePreviewCard
                filename={file.filename}
                filePath={file.filePath}
                gallery={allFiles}
                key={file.filePath}
                mimeType={file.mimeType}
                previewUrl={file.previewUrl}
                projectSubdomain={file.projectSubdomain}
                size={file.size}
                versionRef={file.versionRef}
              />
            ))}
          </div>
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
