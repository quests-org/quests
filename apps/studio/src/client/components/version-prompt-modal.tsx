import { safe } from "@orpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { vanillaRpcClient } from "../rpc/client";
import { GitCommitCard } from "./git-commit-card";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { VersionRef } from "./version-info";

interface VersionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  projectSubdomain: ProjectSubdomain;
  prompt: string;
  versionRef: string;
}

export function VersionPromptModal({
  isOpen,
  onClose,
  onContinue,
  projectSubdomain,
  prompt,
  versionRef,
}: VersionPromptModalProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const navigate = useNavigate();
  const { selectedSessionId } = useSearch({
    from: "/_app/projects/$subdomain/",
  });

  const handleRestoreAndSubmit = async () => {
    if (!selectedSessionId) {
      toast.error("Session required", {
        description: "A session must be selected to restore a version",
      });
      return;
    }

    setIsRestoring(true);
    try {
      const [error, data, isDefined] = await safe(
        vanillaRpcClient.workspace.project.version.restore({
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
      onContinue();
    } catch (error) {
      toast.error("Failed to restore version", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleContinueWithLatest = async () => {
    await navigate({
      from: "/projects/$subdomain",
      params: {
        subdomain: projectSubdomain,
      },
      search: (prev) => ({ ...prev, selectedVersion: undefined }),
    });

    onClose();
    onContinue();
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Restore previous version and submit?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          You&apos;re currently viewing a previous version of your app. Would
          you like to restore this version before continuing?
        </p>

        <div className="mt-2 mb-4 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Your prompt
            </p>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground leading-relaxed">
                {prompt}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Viewing version
            </p>
            <div className="max-h-[200px] overflow-y-auto">
              <GitCommitCard
                disableLink
                isLastGitCommit={false}
                isSelected={false}
                projectSubdomain={projectSubdomain}
                showCommitMessage
                showFileChanges={false}
                versionRef={versionRef}
              />
            </div>
          </div>
        </div>

        {!selectedSessionId && (
          <div className="p-3 bg-muted rounded-md">
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
            disabled={isRestoring}
            onClick={handleContinueWithLatest}
            variant="secondary"
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            Continue from latest
          </Button>
          <Button
            disabled={isRestoreDisabled}
            onClick={handleRestoreAndSubmit}
            variant="default"
          >
            {isRestoring ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-1" />
                Restore version and continue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
