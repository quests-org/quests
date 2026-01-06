import {
  type FileViewerFile,
  openFileViewerAtom,
} from "@/client/atoms/file-viewer";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useSetAtom } from "jotai";

import { FileThumbnail } from "./file-thumbnail";

interface AttachmentItemProps {
  filename: string;
  filePath?: string;
  gallery?: FileViewerFile[];
  mimeType?: string;
  onRemove?: () => void;
  previewUrl?: string;
  projectSubdomain?: ProjectSubdomain;
  size?: number;
  versionRef?: string;
}

export function AttachmentItem({
  filename,
  filePath,
  gallery,
  mimeType,
  onRemove,
  previewUrl,
  projectSubdomain,
  size,
  versionRef,
}: AttachmentItemProps) {
  const openFileViewer = useSetAtom(openFileViewerAtom);

  const handlePreviewClick = () => {
    if (previewUrl) {
      const files = gallery ?? [
        {
          filename,
          filePath,
          mimeType,
          size,
          url: previewUrl,
        },
      ];
      const currentIndex = gallery
        ? gallery.findIndex((f) => f.url === previewUrl)
        : 0;

      openFileViewer({
        currentIndex: currentIndex === -1 ? 0 : currentIndex,
        files,
      });
    }
  };

  return (
    <FileThumbnail
      filename={filename}
      filePath={filePath}
      mimeType={mimeType}
      onClick={handlePreviewClick}
      onRemove={onRemove}
      previewUrl={previewUrl}
      projectSubdomain={projectSubdomain}
      size={size}
      versionRef={versionRef}
    />
  );
}
