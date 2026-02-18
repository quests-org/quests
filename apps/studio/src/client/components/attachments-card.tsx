import { getAssetUrl } from "@/client/lib/get-asset-url";
import {
  type ProjectSubdomain,
  type SessionMessageDataPart,
} from "@quests/workspace/client";

import { FilesGrid } from "./files-grid";

interface FileAttachmentsCardProps {
  assetBaseUrl: string;
  files: SessionMessageDataPart.FileAttachmentDataPart[];
  folders?: SessionMessageDataPart.FolderAttachmentDataPart[];
  projectSubdomain: ProjectSubdomain;
}

export function AttachmentsCard({
  assetBaseUrl,
  files,
  folders,
  projectSubdomain,
}: FileAttachmentsCardProps) {
  const fileItems = files.map((file) => ({
    filename: file.filename,
    filePath: file.filePath,
    mimeType: file.mimeType,
    projectSubdomain,
    size: file.size,
    url: getAssetUrl({
      assetBase: assetBaseUrl,
      filePath: file.filePath,
      versionRef: file.gitRef,
    }),
    versionRef: file.gitRef,
  }));

  return (
    <FilesGrid
      alignEnd
      compact
      files={fileItems}
      folders={folders}
      prioritizeUserFiles
    />
  );
}
