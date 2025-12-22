import { type FileViewerFile } from "@/client/atoms/file-viewer";
import {
  type ProjectSubdomain,
  type SessionMessageDataPart,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "../rpc/client";
import { AttachmentItem } from "./attachment-item";

interface FileAttachmentCardProps {
  file: SessionMessageDataPart.FileAttachmentDataPart;
  files: SessionMessageDataPart.FileAttachmentDataPart[];
  projectSubdomain: ProjectSubdomain;
}

export function FileAttachmentCard({
  file,
  files,
  projectSubdomain,
}: FileAttachmentCardProps) {
  const { data: app } = useQuery(
    rpcClient.workspace.project.bySubdomain.queryOptions({
      input: { subdomain: projectSubdomain },
    }),
  );

  if (!app) {
    return null;
  }

  const assetUrl = getAssetUrl(app.urls.assetBase, file.filePath);

  const gallery: FileViewerFile[] = files.map((f) => ({
    filename: f.filename,
    filePath: f.filePath,
    mimeType: f.mimeType,
    size: f.size,
    url: getAssetUrl(app.urls.assetBase, f.filePath),
  }));

  return (
    <AttachmentItem
      filename={file.filename}
      filePath={file.filePath}
      gallery={gallery}
      mimeType={file.mimeType}
      previewUrl={assetUrl}
      size={file.size}
    />
  );
}

function getAssetUrl(assetBase: string, filePath: string): string {
  const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath;
  return `${assetBase}/${cleanPath}`;
}
