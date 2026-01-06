import { rpcClient } from "@/client/rpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, FolderOpen, MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getRevealInFolderLabel } from "../lib/utils";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function FileActionsMenu({
  filePath,
  onCopy,
  projectSubdomain,
}: {
  filePath?: string;
  onCopy?: () => Promise<void> | void;
  projectSubdomain?: ProjectSubdomain;
}) {
  const [copied, setCopied] = useState(false);

  const showProjectFileInFolderMutation = useMutation(
    rpcClient.utils.showProjectFileInFolder.mutationOptions({
      onError: (error) => {
        const label = getRevealInFolderLabel();
        const lowercasedLabel = label.charAt(0).toLowerCase() + label.slice(1);
        toast.error(`Failed to ${lowercasedLabel}`, {
          description: error.message,
        });
      },
    }),
  );

  const handleCopy = async () => {
    if (!onCopy) {
      return;
    }
    try {
      await onCopy();
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const handleRevealInFolder = () => {
    if (!filePath || !projectSubdomain) {
      return;
    }

    showProjectFileInFolderMutation.mutate({
      filePath,
      subdomain: projectSubdomain,
    });
  };

  if (!onCopy && !filePath) {
    return null;
  }

  const hasRevealOption = filePath && projectSubdomain;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">
          {copied ? (
            <Check className="size-4" />
          ) : (
            <MoreVertical className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onCopy && (
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="size-4" />
            <span>Copy</span>
          </DropdownMenuItem>
        )}
        {onCopy && hasRevealOption && <DropdownMenuSeparator />}
        {hasRevealOption && (
          <DropdownMenuItem onClick={handleRevealInFolder}>
            <FolderOpen className="size-4" />
            <span>{getRevealInFolderLabel()}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
