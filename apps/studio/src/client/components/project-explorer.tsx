import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { appendToPromptAtom } from "@/client/atoms/prompt-value";
import { FileIcon } from "@/client/components/file-icon";
import { getAssetUrl } from "@/client/lib/get-asset-url";
import {
  isProjectFileSrcFile,
  shouldFilterProjectFile,
} from "@/client/lib/project-file-groups";
import { cn, getRevealInFolderLabel } from "@/client/lib/utils";
import { type RPCOutput } from "@/client/rpc/client";
import { safe } from "@orpc/client";
import {
  APP_FOLDER_NAMES,
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import {
  ChevronRight,
  Files,
  FolderClosed,
  FolderOpen,
  Folders,
  Globe,
  type LucideIcon,
  MessageSquare,
  MoreVertical,
} from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";
import { FileActionsMenuItems } from "./file-actions-menu";
import { FilePreviewCard } from "./file-preview-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "./ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type AttachedFolder = NonNullable<
  RPCOutput["workspace"]["project"]["state"]["get"]["attachedFolders"]
>[string];

type FileTreeNode =
  | { children: FileTreeNode[]; kind: "dir"; name: string }
  | { file: ProjectFileViewerFile; kind: "file" };

export function ProjectExplorer({
  activeFilePath,
  attachedFolders,
  files,
  isAppViewOpen,
  onAppSelect,
  onFileSelect,
  project,
  showAppEntry,
}: {
  activeFilePath: null | string;
  attachedFolders: RPCOutput["workspace"]["project"]["state"]["get"]["attachedFolders"];
  files: RPCOutput["workspace"]["project"]["git"]["listFiles"] | undefined;
  isAppViewOpen: boolean;
  onAppSelect: () => void;
  onFileSelect: (file: { filePath: string; versionRef: string }) => void;
  project: WorkspaceAppProject;
  showAppEntry: boolean;
}) {
  const appendToPrompt = useSetAtom(appendToPromptAtom);

  const computed = useMemo(() => {
    if (!files) {
      return null;
    }

    const toViewerFile = (
      f: (typeof files)[number],
    ): ProjectFileViewerFile => ({
      filename: f.filename,
      filePath: f.filePath,
      mimeType: f.mimeType,
      projectSubdomain: project.subdomain,
      url: getAssetUrl({
        assetBase: project.urls.assetBase,
        filePath: f.filePath,
      }),
      versionRef: "",
    });

    const visibleFiles: ProjectFileViewerFile[] = [];
    const hiddenFiles: ProjectFileViewerFile[] = [];

    for (const f of files) {
      if (
        isProjectFileSrcFile(f.filePath) ||
        shouldFilterProjectFile(f.filePath) ||
        // TODO(skills): Remove this once skills are no longer in the project folder
        f.filePath.startsWith("skills/")
      ) {
        hiddenFiles.push(toViewerFile(f));
      } else {
        visibleFiles.push(toViewerFile(f));
      }
    }

    const allFiles = [...visibleFiles, ...hiddenFiles];

    return {
      allFiles,
      hiddenTree: buildTree(hiddenFiles),
      tree: buildTree(visibleFiles),
      visibleFiles,
    };
  }, [files, project.subdomain, project.urls.assetBase]);

  if (!computed) {
    return (
      <div className="flex flex-col gap-1.5 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div className="h-5 animate-pulse rounded-sm bg-muted" key={i} />
        ))}
      </div>
    );
  }

  const handleFileClick = (file: ProjectFileViewerFile) => {
    onFileSelect({ filePath: file.filePath, versionRef: file.versionRef });
  };

  const folderEntries = attachedFolders ? Object.values(attachedFolders) : [];

  if (
    computed.visibleFiles.length === 0 &&
    computed.hiddenTree.length === 0 &&
    folderEntries.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
        <Files className="size-6 opacity-40" />
        <p className="text-xs">No files yet</p>
      </div>
    );
  }

  const appAddToChatLabel = `the app in ${APP_FOLDER_NAMES.src}/`;

  const handleAppAddToChat = () => {
    appendToPrompt({ key: project.subdomain, update: appAddToChatLabel });
  };

  return (
    <SidebarProvider
      className="min-h-0 flex-col py-1 pr-1"
      style={{ "--sidebar-width": "100%" } as React.CSSProperties}
    >
      {showAppEntry && (
        <SidebarMenu>
          <SidebarMenuItem>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <SidebarMenuButton
                  className={cn(
                    "h-7 min-w-0 flex-1 gap-1.5 rounded-md px-2 text-xs font-medium",
                    isAppViewOpen
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={onAppSelect}
                >
                  <Globe className="size-3.5! shrink-0" />
                  <span className="truncate">App</span>
                </SidebarMenuButton>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={handleAppAddToChat}>
                  <MessageSquare className="size-4" />
                  <span>Add to chat</span>
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            <ExplorerItemMenu>
              <DropdownMenuItem onClick={handleAppAddToChat}>
                <MessageSquare className="size-4" />
                <span>Add to chat</span>
              </DropdownMenuItem>
            </ExplorerItemMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
      {folderEntries.length > 0 && (
        <SidebarMenu>
          <SidebarMenuItem>
            <CollapsibleTreeSection
              defaultOpen
              icon={Folders}
              label="Attached Folders"
            >
              {folderEntries.map((folder) => (
                <AttachedFolderRow
                  folder={folder}
                  key={folder.id}
                  projectSubdomain={project.subdomain}
                />
              ))}
            </CollapsibleTreeSection>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
      <SidebarMenu>
        {computed.tree.map((node, i) => (
          <TreeNode
            activeFilePath={activeFilePath}
            defaultOpen={
              node.kind === "dir" &&
              (node.name === APP_FOLDER_NAMES.userProvided ||
                node.name === APP_FOLDER_NAMES.output)
            }
            key={i}
            node={node}
            onFileClick={handleFileClick}
          />
        ))}
        {computed.hiddenTree.length > 0 && (
          <SidebarMenuItem>
            <CollapsibleTreeSection
              label="Other Files"
              labelClassName="text-muted-foreground/60"
            >
              {computed.hiddenTree.map((node, i) => (
                <TreeNode
                  activeFilePath={activeFilePath}
                  key={i}
                  node={node}
                  onFileClick={handleFileClick}
                />
              ))}
            </CollapsibleTreeSection>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarProvider>
  );
}

function AttachedFolderMenuItems({
  onAddToChat,
  onReveal,
  variant,
}: {
  onAddToChat: () => void;
  onReveal: () => void;
  variant: "context" | "dropdown";
}) {
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;
  const Separator =
    variant === "context" ? ContextMenuSeparator : DropdownMenuSeparator;

  return (
    <>
      <Item onClick={onAddToChat}>
        <MessageSquare className="size-4" />
        <span>Add to chat</span>
      </Item>
      <Separator />
      <Item onClick={onReveal}>
        <FolderOpen className="size-4" />
        <span>{getRevealInFolderLabel()}</span>
      </Item>
    </>
  );
}

function AttachedFolderRow({
  folder,
  projectSubdomain,
}: {
  folder: AttachedFolder;
  projectSubdomain: ProjectSubdomain;
}) {
  const appendToPrompt = useSetAtom(appendToPromptAtom);

  const revealMutation = useMutation(
    rpcClient.utils.showFileInFolder.mutationOptions({
      onError: (error) => {
        toast.error(`Failed to ${getRevealInFolderLabel().toLowerCase()}`, {
          description: error.message,
        });
      },
    }),
  );

  const handleClick = async () => {
    const [error] = await safe(
      rpcClient.utils.openFolder.call({ folderPath: folder.path }),
    );
    if (error) {
      toast.error("Failed to open folder", { description: error.message });
    }
  };

  const handleAddToChat = () => {
    appendToPrompt({
      key: projectSubdomain,
      update: `the attached folder "${folder.name}"`,
    });
  };

  const handleReveal = () => {
    revealMutation.mutate({ filepath: folder.path });
  };

  return (
    <SidebarMenuItem>
      <ContextMenu>
        <Tooltip delayDuration={400} disableHoverableContent>
          <TooltipTrigger asChild>
            <ContextMenuTrigger asChild>
              <SidebarMenuButton
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => void handleClick()}
              >
                <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-foreground/80">
                  {folder.name}
                </span>
              </SidebarMenuButton>
            </ContextMenuTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-64" side="left" sideOffset={8}>
            <p>{getRevealInFolderLabel()}</p>
            <p className="text-xs break-all text-background/60">
              {folder.path}
            </p>
          </TooltipContent>
        </Tooltip>
        <ContextMenuContent>
          <AttachedFolderMenuItems
            onAddToChat={handleAddToChat}
            onReveal={handleReveal}
            variant="context"
          />
        </ContextMenuContent>
      </ContextMenu>
      <ExplorerItemMenu>
        <AttachedFolderMenuItems
          onAddToChat={handleAddToChat}
          onReveal={handleReveal}
          variant="dropdown"
        />
      </ExplorerItemMenu>
    </SidebarMenuItem>
  );
}

function buildTree(files: ProjectFileViewerFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.filePath.split("/");
    let nodes = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!part) {
        continue;
      }
      let dir = nodes.find(
        (n): n is Extract<FileTreeNode, { kind: "dir" }> =>
          n.kind === "dir" && n.name === part,
      );
      if (!dir) {
        dir = { children: [], kind: "dir", name: part };
        nodes.push(dir);
      }
      nodes = dir.children;
    }

    nodes.push({ file, kind: "file" });
  }

  root.sort((a, b) => rankTreeNode(a) - rankTreeNode(b));

  return root;
}

function ExplorerItemMenu({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction showOnHover>
          <MoreVertical />
          <span className="sr-only">More</span>
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileRow({
  file,
  isActive,
  onClick,
}: {
  file: ProjectFileViewerFile;
  isActive: boolean;
  onClick: () => void;
}) {
  const appendToPrompt = useSetAtom(appendToPromptAtom);

  const handleAddToChat = () => {
    appendToPrompt({
      key: file.projectSubdomain,
      update: file.filePath,
    });
  };

  return (
    <SidebarMenuItem>
      <ContextMenu>
        <Tooltip delayDuration={400} disableHoverableContent>
          <TooltipTrigger asChild>
            <ContextMenuTrigger asChild>
              <SidebarMenuButton
                className="h-7 gap-1.5 px-2 text-xs"
                isActive={isActive}
                onClick={onClick}
              >
                <FileIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  filename={file.filename}
                  mimeType={file.mimeType}
                />
                <span className="truncate text-foreground/80">
                  {file.filename}
                </span>
              </SidebarMenuButton>
            </ContextMenuTrigger>
          </TooltipTrigger>
          {isActive ? (
            <TooltipContent side="left" sideOffset={8}>
              <p className="text-xs break-all">{file.filePath}</p>
            </TooltipContent>
          ) : (
            <TooltipContent
              align="end"
              arrow={
                <div className="border-x-[5px] border-t-[5px] border-x-transparent border-t-border" />
              }
              arrowPadding={8}
              className="w-96 overflow-visible rounded-lg bg-transparent p-0 shadow-md"
              side="left"
              sideOffset={8}
            >
              <FilePreviewCard file={file} hideActionsMenu onClick={onClick} />
            </TooltipContent>
          )}
        </Tooltip>
        <ContextMenuContent>
          <FileActionsMenuItems
            file={file}
            onAddToChat={handleAddToChat}
            variant="context"
          />
        </ContextMenuContent>
      </ContextMenu>
      <ExplorerItemMenu>
        <FileActionsMenuItems
          file={file}
          onAddToChat={handleAddToChat}
          variant="dropdown"
        />
      </ExplorerItemMenu>
    </SidebarMenuItem>
  );
}

const DIR_RANK: Record<string, number> = {
  [APP_FOLDER_NAMES.output]: 0,
  [APP_FOLDER_NAMES.userProvided]: 1,
};

function CollapsibleTreeSection({
  children,
  defaultOpen = false,
  icon: Icon,
  label,
  labelClassName,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: LucideIcon;
  label: string;
  labelClassName?: string;
}) {
  return (
    <Collapsible
      className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger asChild>
        <SidebarMenuButton
          className={cn(
            "h-7 gap-1 px-2 text-xs text-muted-foreground",
            labelClassName,
          )}
        >
          <ChevronRight className="size-3! shrink-0 transition-transform" />
          {Icon && <Icon className="size-3.5! shrink-0" />}
          <span className="truncate">{label}</span>
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ml-3 flex min-w-0 flex-col overflow-hidden border-l border-border/50 pl-1">
          {children}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function rankTreeNode(node: FileTreeNode) {
  return node.kind === "dir" ? (DIR_RANK[node.name] ?? 2) : 2;
}

function TreeNode({
  activeFilePath,
  defaultOpen = false,
  node,
  onFileClick,
}: {
  activeFilePath: null | string;
  defaultOpen?: boolean;
  node: FileTreeNode;
  onFileClick: (file: ProjectFileViewerFile) => void;
}) {
  if (node.kind === "file") {
    return (
      <FileRow
        file={node.file}
        isActive={node.file.filePath === activeFilePath}
        onClick={() => {
          onFileClick(node.file);
        }}
      />
    );
  }

  return (
    <SidebarMenuItem>
      <CollapsibleTreeSection defaultOpen={defaultOpen} label={node.name}>
        {node.children.map((child, i) => (
          <TreeNode
            activeFilePath={activeFilePath}
            key={i}
            node={child}
            onFileClick={onFileClick}
          />
        ))}
      </CollapsibleTreeSection>
    </SidebarMenuItem>
  );
}
