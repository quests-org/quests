import { safe } from "@orpc/client";
import { FolderClosed } from "lucide-react";

import { folderNameFromPath } from "../lib/path-utils";
import { rpcClient } from "../rpc/client";
import { AttachedItemPreview } from "./attached-item-preview";

export function AttachedFolderPreview(props: {
  folderPath: string;
  onRemove?: () => void;
}) {
  const { folderPath, onRemove } = props;
  const folderName = folderNameFromPath(folderPath);

  const handleClick = async () => {
    const [error] = await safe(rpcClient.utils.openFolder.call({ folderPath }));

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to open folder:", error);
    }
  };

  return (
    <AttachedItemPreview
      icon={<FolderClosed className="size-5 shrink-0 text-muted-foreground" />}
      label={folderName}
      onClick={handleClick}
      onRemove={onRemove}
      tooltip={folderPath}
    />
  );
}
