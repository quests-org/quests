import { getAssetUrl } from "@/client/lib/get-asset-url";
import {
  type ProjectSubdomain,
  type SessionMessageDataPart,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "../rpc/client";
import { FilesGrid } from "./files-grid";

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

  const fileItems = files.map((file) => ({
    filename: file.filename,
    filePath: file.filePath,
    mimeType: file.mimeType,
    previewUrl: getAssetUrl({
      assetBase: app.urls.assetBase,
      filePath: file.filePath,
      versionRef: file.gitRef,
    }),
    projectSubdomain,
    size: file.size,
    versionRef: file.gitRef,
  }));

  return <FilesGrid alignEnd files={fileItems} />;
}
