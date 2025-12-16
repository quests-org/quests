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
  const isImage = isImageFile(mimeType);

  return (
    <AttachmentItem
      filename={filename}
      previewUrl={isImage ? assetUrl : undefined}
    />
  );
}

function getAssetUrl(assetBase: string, filePath: string): string {
  const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath;
  return `${assetBase}/${cleanPath}`;
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
