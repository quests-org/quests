import { AppFavoriteDialog } from "@/client/components/app-favorite-dialog";
import { SmallAppIcon } from "@/client/components/app-icon";
import { Button } from "@/client/components/ui/button";
import { ToolbarFavoriteAction } from "@/client/components/ui/toolbar-favorite-action";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ExternalLinkIcon,
  FolderOpenIcon,
  PencilIcon,
  PenLine,
  SettingsIcon,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { TrashIcon } from "./icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface ProjectHeaderToolbarProps {
  project: WorkspaceAppProject;
}

export function ProjectHeaderToolbar({ project }: ProjectHeaderToolbarProps) {
  const { data: favoriteProjects } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );
  const [settingsDialogMode, setSettingsDialogMode] = useState<
    "favorites" | "settings" | undefined
  >(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newName, setNewName] = useState("");

  const isFavorite = favoriteProjects?.some(
    (favorite) => favorite.subdomain === project.subdomain,
  );

  const { isPending, trashApp } = useTrashApp({ navigateOnDelete: true });
  const { isPending: isRenameLoading, mutateAsync: renameApp } = useMutation(
    rpcClient.workspace.project.updateName.mutationOptions(),
  );

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const openAppInMutation = useMutation(
    rpcClient.utils.openAppIn.mutationOptions({
      onError: (error) => {
        toast.error("Failed to open in app", {
          description: error.message,
        });
      },
    }),
  );

  const handleDelete = async () => {
    try {
      await trashApp(project.subdomain);
      setShowDeleteDialog(false);
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

  const handleOpenExternalClick = () => {
    openExternalLinkMutation.mutate({ url: project.urls.localhost });
  };

  return (
    <>
      <div className="bg-background shadow-sm pl-3 pr-2 py-1 w-full">
        <div className="flex items-center justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="text-lg font-semibold text-foreground h-auto hover:bg-accent hover:text-accent-foreground gap-2 py-1 has-[>svg]:px-1"
                variant="ghost"
              >
                <SmallAppIcon
                  background={project.icon?.background}
                  icon={project.icon?.lucide}
                  size="md"
                />
                {project.title}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                onSelect={() => {
                  setNewName(project.title);
                  setShowRenameDialog(true);
                }}
              >
                <PencilIcon className="h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex justify-between"
                onClick={() => {
                  setSettingsDialogMode("settings");
                }}
              >
                <SettingsIcon className="h-4 w-4" />
                <span>App Settings</span>
              </DropdownMenuItem>

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

          <div className="flex items-center gap-2">
            <ToolbarFavoriteAction compact project={project} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="gap-1 px-2 py-1 h-10"
                  size="sm"
                  variant="ghost"
                >
                  <PenLine className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    void openAppInMutation.mutateAsync({
                      subdomain: project.subdomain,
                      type: "terminal",
                    });
                  }}
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  Open in Terminal
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void openAppInMutation.mutateAsync({
                      subdomain: project.subdomain,
                      type: "cursor",
                    });
                  }}
                >
                  <PenLine className="h-4 w-4 mr-2" />
                  Open in Cursor
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void openAppInMutation.mutateAsync({
                      subdomain: project.subdomain,
                      type: "vscode",
                    });
                  }}
                >
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  Open in VS Code
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void openAppInMutation.mutateAsync({
                      subdomain: project.subdomain,
                      type: "show-in-folder",
                    });
                  }}
                >
                  <FolderOpenIcon className="h-4 w-4 mr-2" />
                  {isMacOS() ? "Reveal in Finder" : "Show in File Manager"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenExternalClick}>
                  <ExternalLinkIcon className="h-4 w-4 mr-2" />
                  Open in External Browser
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

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
        <DialogContent className="sm:max-w-[425px]">
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
                value={newName}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isRenameLoading}
              onClick={handleRename}
              type="submit"
            >
              {isRenameLoading ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppFavoriteDialog
        dialogTitle={
          settingsDialogMode === "favorites"
            ? "Add Favorite"
            : "Project Settings"
        }
        isFavorite={!!isFavorite}
        mode={settingsDialogMode ?? "settings"}
        onOpenChange={(open) => {
          setSettingsDialogMode(open ? "favorites" : undefined);
        }}
        open={!!settingsDialogMode}
        subdomain={project.subdomain}
      />
    </>
  );
}
