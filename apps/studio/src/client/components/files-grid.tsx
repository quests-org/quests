import {
  type FileViewerFile,
  openFileViewerAtom,
} from "@/client/atoms/file-viewer";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useSetAtom } from "jotai";

import { FilePreviewCard } from "./file-preview-card";
import { FileThumbnail } from "./file-thumbnail";

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
  alignEnd?: boolean;
  files: FileItem[];
}

export function FilesGrid({ alignEnd = false, files }: FilesGridProps) {
  const openFileViewer = useSetAtom(openFileViewerAtom);

  const allFiles: FileViewerFile[] = files.map((f) => ({
    filename: f.filename,
    filePath: f.filePath,
    mimeType: f.mimeType,
    projectSubdomain: f.projectSubdomain,
    size: f.size,
    url: f.previewUrl,
    versionRef: f.versionRef,
  }));

  const handleFileClick = (file: FileItem) => {
    const currentIndex = allFiles.findIndex((f) => f.url === file.previewUrl);
    openFileViewer({
      currentIndex: currentIndex === -1 ? 0 : currentIndex,
      files: allFiles,
    });
  };

  const richPreviewFiles: (FileItem & { shouldSpanTwo?: boolean })[] = [];
  const otherFiles: FileItem[] = [];

  for (const file of files) {
    const isImage = file.mimeType.startsWith("image/");
    const isHtml = file.mimeType === "text/html";
    const isPdf = file.mimeType === "application/pdf";
    const isVideo = file.mimeType.startsWith("video/");
    const isAudio = file.mimeType.startsWith("audio/");
    const isMarkdown = file.mimeType === "text/markdown";

    if (isImage || isHtml || isPdf || isVideo || isAudio || isMarkdown) {
      richPreviewFiles.push({
        ...file,
        shouldSpanTwo: isAudio || isMarkdown,
      });
    } else {
      otherFiles.push(file);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {richPreviewFiles.length > 0 && (
        <div className="@container">
          <div
            className={`flex flex-wrap gap-2 ${alignEnd ? "justify-end" : ""}`}
          >
            {richPreviewFiles.map((file) => (
              <div
                className={`w-full shrink-0 grow-0 @md:w-[calc((100%/2)-(0.5rem/2))] ${
                  file.shouldSpanTwo
                    ? "@2xl:w-[calc((100%/3*2)-(0.5rem/3))]"
                    : "@2xl:w-[calc((100%/3)-(0.5rem*2/3))]"
                }`}
                key={file.filePath}
              >
                <FilePreviewCard
                  filename={file.filename}
                  filePath={file.filePath}
                  mimeType={file.mimeType}
                  onClick={() => {
                    handleFileClick(file);
                  }}
                  previewUrl={file.previewUrl}
                  projectSubdomain={file.projectSubdomain}
                  size={file.size}
                  versionRef={file.versionRef}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {otherFiles.length > 0 && (
        <div className="flex flex-wrap items-start gap-2">
          {otherFiles.map((file) => (
            <div className="h-12 min-w-0" key={file.filePath}>
              <FileThumbnail
                filename={file.filename}
                filePath={file.filePath}
                mimeType={file.mimeType}
                onClick={() => {
                  handleFileClick(file);
                }}
                previewUrl={file.previewUrl}
                projectSubdomain={file.projectSubdomain}
                size={file.size}
                versionRef={file.versionRef}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
