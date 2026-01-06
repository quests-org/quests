import { type FileViewerFile } from "@/client/atoms/file-viewer";
import { getAssetUrl } from "@/client/lib/get-asset-url";
import {
  type ProjectSubdomain,
  type SessionMessageDataPart,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "../rpc/client";
import { AttachmentItem } from "./attachment-item";

interface FileAttachmentsCardProps {
  files: SessionMessageDataPart.FileAttachmentDataPart[];
  projectSubdomain: ProjectSubdomain;
}

export function FileAttachmentsCard({
  files,
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
      versionRef: f.gitRef,
    }),
    versionRef: f.gitRef,
  }));

  return (
    <div className="flex flex-wrap items-start justify-end gap-2">
      {files.map((file) => {
        const assetUrl = getAssetUrl({
          assetBase: app.urls.assetBase,
          filePath: file.filePath,
          versionRef: file.gitRef,
        });

        return (
          <AttachmentItem
            filename={file.filename}
            filePath={file.filePath}
            gallery={gallery}
            key={file.filePath}
            mimeType={file.mimeType}
            previewUrl={assetUrl}
            projectSubdomain={projectSubdomain}
            size={file.size}
            versionRef={file.gitRef}
          />
        );
      })}
    </div>
  );
}
