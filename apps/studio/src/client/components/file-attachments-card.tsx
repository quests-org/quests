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

interface FileAttachmentsCardProps {
  files: SessionMessageDataPart.FileAttachmentDataPart[];
  messageId: StoreId.Message;
  projectSubdomain: ProjectSubdomain;
}

export function FileAttachmentsCard({
  files,
  messageId,
  projectSubdomain,
}: FileAttachmentsCardProps) {
  const { data: app } = useQuery(
    rpcClient.workspace.project.bySubdomain.queryOptions({
      input: { subdomain: projectSubdomain },
    }),
  );

  if (!app) {
    return null;
  }

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
    <div className="flex flex-wrap items-start justify-end gap-2">
      {files.map((file) => {
        const assetUrl = getAssetUrl({
          assetBase: app.urls.assetBase,
          filePath: file.filePath,
          messageId,
        });

        return (
          <AttachmentItem
            filename={file.filename}
            filePath={file.filePath}
            gallery={gallery}
            key={file.filePath}
            mimeType={file.mimeType}
            previewUrl={assetUrl}
            size={file.size}
          />
        );
      })}
    </div>
  );
}
