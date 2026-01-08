import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import {
  copyFileToClipboard,
  downloadFile,
  isFileCopyable,
  isFileDownloadable,
} from "@/client/lib/file-actions";
import { Copy, Download, MoreVertical } from "lucide-react";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function FilePreviewActionsMenu({
  file,
}: {
  file: ProjectFileViewerFile;
}) {
  const { mimeType, url } = file;
  const isDownloadable = isFileDownloadable(url);
  const isCopyable = isFileCopyable(mimeType, url);

  if (!isDownloadable) {
    return null;
  }

  const handleDownload = async () => {
    await downloadFile(file);
  };

  const handleCopy = async () => {
    await copyFileToClipboard({ url });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="size-6 shrink-0 text-muted-foreground hover:text-foreground"
          size="icon"
          variant="ghost"
        >
          <MoreVertical className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="size-4" />
          <span>Download</span>
        </DropdownMenuItem>
        {isCopyable && (
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="size-4" />
            <span>Copy</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
