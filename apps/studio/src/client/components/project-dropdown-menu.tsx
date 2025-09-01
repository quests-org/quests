import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { PencilIcon } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { TrashIcon } from "./icons";

interface ProjectDropdownMenuProps {
  children: React.ReactNode;
  moreActions?: React.ReactNode;
  navigateOnDelete?: boolean;
  onDelete?: () => void;
  project: WorkspaceAppProject;
}

export function ProjectDropdownMenu({
  children,
  moreActions,
  navigateOnDelete = true,
  onDelete,
  project,
}: ProjectDropdownMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState("");

  const { isPending, trashApp } = useTrashApp({ navigateOnDelete });
  const { isPending: isRenameLoading, mutateAsync: renameApp } = useMutation(
    rpcClient.workspace.project.updateName.mutationOptions(),
  );

  const handleDelete = async () => {
    try {
      await trashApp(project.subdomain);
      setShowDeleteDialog(false);
      onDelete?.();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a valid name");
      return;
    }
    try {
      await renameApp({
        newName: newName.trim(),
        subdomain: project.subdomain,
      });
      toast.success("Project renamed successfully");
      setShowRenameDialog(false);
      setNewName("");
    } catch {
      toast.error("Failed to rename project");
    }
  };

  return (
    <>
      <DropdownMenu modal>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            onSelect={() => {
              setNewName(project.title);
              setShowRenameDialog(true);
            }}
          >
            <PencilIcon />
            <span>Rename</span>
          </DropdownMenuItem>

          {moreActions}

          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/15 focus:text-destructive"
            onSelect={() => {
              setShowDeleteDialog(true);
            }}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move your project to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              asChild
              className="text-white"
              disabled={isPending}
              onClick={handleDelete}
            >
              <Button variant="destructive">
                {isPending ? "Deleting..." : "Continue"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog onOpenChange={setShowRenameDialog} open={showRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="name">
                Name
              </Label>
              <Input
                className="col-span-3"
                id="name"
                onChange={(e) => {
                  setNewName(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleRename();
                  }
                }}
                value={newName}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isRenameLoading}
              onClick={() => {
                setShowRenameDialog(false);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isRenameLoading} onClick={handleRename}>
              {isRenameLoading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
