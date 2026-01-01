import { type FileViewerFile } from "@/client/atoms/file-viewer";
import { getAssetUrl } from "@/client/lib/asset-utils";
import {
  type ProjectSubdomain,
  type SessionMessageDataPart,
  type StoreId,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "../rpc/client";
import { AttachmentItem } from "./attachment-item";

interface FileAttachmentCardProps {
  file: SessionMessageDataPart.FileAttachmentDataPart;
  files: SessionMessageDataPart.FileAttachmentDataPart[];
  messageId: StoreId.Message;
  projectSubdomain: ProjectSubdomain;
}

export function FileAttachmentCard({
  file,
  files,
  messageId,
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

  const assetUrl = getAssetUrl({
    assetBase: app.urls.assetBase,
    filePath: file.filePath,
    messageId,
  });

  const gallery: FileViewerFile[] = files.map((f) => ({
    filename: f.filename,
    filePath: f.filePath,
    mimeType: f.mimeType,
    projectSubdomain,
    size: f.size,
    url: getAssetUrl({
      assetBase: app.urls.assetBase,
      filePath: f.filePath,
      messageId,
    }),
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
