import { safe } from "@orpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";
import { GitCommitCard } from "./git-commit-card";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { VersionRef } from "./version-info";

interface RestoreVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
}

export function RestoreVersionModal({
  isOpen,
  onClose,
  onRestore,
  projectSubdomain,
  versionRef,
}: RestoreVersionModalProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const navigate = useNavigate();
  const { selectedSessionId } = useSearch({
    from: "/_app/projects/$subdomain/",
  });

  const handleRestore = async () => {
    if (!selectedSessionId) {
      toast.error("Session required", {
        description: "A session must be selected to restore a version",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const [error, data, isDefined] = await safe(
        rpcClient.workspace.project.version.restore.call({
          gitRef: versionRef,
          projectSubdomain,
          sessionId: selectedSessionId,
        }),
      );

      if (error) {
        if (isDefined) {
          switch (error.code) {
            case "NO_CHANGES": {
              toast.error("No changes to restore", {
                description:
                  "Restoring to this version would not make any changes",
              });
              break;
            }
            case "VERSION_NOT_FOUND": {
              toast.error("Version not found", {
                description:
                  "The version you are trying to restore is missing from Git",
              });
              break;
            }
            default: {
              toast.error("Unable to restore version", {
                description: error.message,
              });
            }
          }
        } else {
          toast.error("Unable to restore version", {
            description: error.message,
          });
        }
        return;
      }

      onRestore();

      toast.success("Version restored successfully", {
        description: (
          <VersionRef
            projectSubdomain={projectSubdomain}
            versionRef={data.restoredToRef}
          />
        ),
      });

      await navigate({
        from: "/projects/$subdomain",
        params: {
          subdomain: projectSubdomain,
        },
        search: (prev) => ({ ...prev, selectedVersion: undefined }),
      });

      onClose();
    } catch (error) {
      toast.error("Failed to restore version", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const isRestoreDisabled = isRestoring || !selectedSessionId;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={isOpen}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore Version</DialogTitle>
          <DialogDescription>
            You are about to restore your project to this version:
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 max-h-[300px] overflow-y-auto">
          <GitCommitCard
            disableLink
            isLastGitCommit={false}
            isSelected={false}
            projectSubdomain={projectSubdomain}
            showCommitMessage
            versionRef={versionRef}
          />
        </div>

        {!selectedSessionId && (
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              A session must be selected to restore a version. Select a session
              from the sidebar first.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button disabled={isRestoring} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isRestoreDisabled}
            onClick={handleRestore}
            variant="destructive"
          >
            {isRestoring ? "Restoring..." : "Restore Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
