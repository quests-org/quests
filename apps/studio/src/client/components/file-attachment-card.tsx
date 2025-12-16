import { type ProjectSubdomain } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { rpcClient } from "../rpc/client";
import { AttachmentItem } from "./attachment-item";

interface FileAttachmentCardProps {
  filename: string;
  filePath: string;
  mimeType: string;
  projectSubdomain: ProjectSubdomain;
  size: number;
}

export function FileAttachmentCard({
  filename,
  filePath,
  mimeType,
  projectSubdomain,
  size,
}: FileAttachmentCardProps) {
  const { data: app } = useQuery(
    rpcClient.workspace.project.bySubdomain.queryOptions({
      input: { subdomain: projectSubdomain },
    }),
  );

  if (!app) {
    return null;
  }

  const assetUrl = getAssetUrl(app.urls.assetBase, filePath);

  return (
    <AttachmentItem
      filename={filename}
      mimeType={mimeType}
      previewUrl={assetUrl}
      size={size}
    />
  );
}

function getAssetUrl(assetBase: string, filePath: string): string {
  const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath;
  return `${assetBase}/${cleanPath}`;
}
