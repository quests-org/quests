import { safe } from "@orpc/client";
import { type SessionMessageDataPart } from "@quests/workspace/client";
import { FolderClosed } from "lucide-react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";
import { PreviewListItem } from "./preview-list-item";

export function FolderPreviewListItem({
  folder,
}: {
  folder: SessionMessageDataPart.FolderAttachmentDataPart;
}) {
  const handleClick = async () => {
    const [error] = await safe(
      rpcClient.utils.openFolder.call({ folderPath: folder.path }),
    );

    if (error) {
      toast.error("Failed to open folder", {
        description: error.message,
      });
    }
  };

  return (
    <PreviewListItem
      icon={<FolderClosed className="size-5 shrink-0 text-muted-foreground" />}
      label={folder.name}
      onClick={handleClick}
      tooltipContent={folder.path}
    />
  );
}
