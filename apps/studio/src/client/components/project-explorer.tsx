import { type ProjectFileViewerFile } from "@/client/atoms/project-file-viewer";
import { appendToPromptAtom } from "@/client/atoms/prompt-value";
import { ConfirmedIconButton } from "@/client/components/confirmed-icon-button";
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
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useSetAtom } from "jotai";
import {
  AppWindow,
  ChevronRight,
  Files,
  Folder,
  FolderClosed,
  FolderDot,
  Folders,
  type LucideIcon,
  MessageSquare,
} from "lucide-react";
import * as React from "react";
import { useMemo } from "react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";
import { FilePreviewCard } from "./file-preview-card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  SidebarMenu,
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

  return (
    <SidebarProvider
      className="min-h-0 flex-col py-1"
      style={{ "--sidebar-width": "100%" } as React.CSSProperties}
    >
      {showAppEntry && (
        <SidebarMenu className="px-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              className={cn(
                "h-7 gap-1.5 rounded-md px-2 text-xs font-medium",
                isAppViewOpen
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground",
              )}
              onClick={onAppSelect}
            >
              <AppWindow className="size-3.5 shrink-0" />
              <span className="truncate">App</span>
            </SidebarMenuButton>
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
                <AttachedFolderRow folder={folder} key={folder.id} />
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
              icon={FolderDot}
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

function AttachedFolderRow({ folder }: { folder: AttachedFolder }) {
  const handleClick = async () => {
    const [error] = await safe(
      rpcClient.utils.openFolder.call({ folderPath: folder.path }),
    );

    if (error) {
      toast.error("Failed to open folder", { description: error.message });
    }
  };

  return (
    <SidebarMenuItem>
      <Tooltip delayDuration={400} disableHoverableContent>
        <TooltipTrigger asChild>
          <button
            className="flex h-6 w-full min-w-0 items-center gap-1.5 px-2 text-left transition-colors hover:bg-sidebar-accent"
            onClick={() => void handleClick()}
            type="button"
          >
            <FolderClosed className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-foreground/80">
              {folder.name}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64" side="left" sideOffset={8}>
          <p>{getRevealInFolderLabel()}</p>
          <p className="text-xs break-all text-background/60">{folder.path}</p>
        </TooltipContent>
      </Tooltip>
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
    appendToPrompt({ key: file.projectSubdomain, update: `${file.filePath} ` });
  };

  return (
    <div
      className={cn(
        "group relative flex h-6 w-full items-center transition-colors",
        isActive
          ? "text-foreground before:absolute before:inset-y-0 before:right-0 before:-left-[100vw] before:bg-sidebar-accent before:content-['']"
          : "hover:before:absolute hover:before:inset-y-0 hover:before:right-0 hover:before:-left-[100vw] hover:before:bg-sidebar-accent hover:before:content-['']",
      )}
    >
      <Tooltip delayDuration={400} disableHoverableContent>
        <TooltipTrigger asChild>
          <button
            className="relative z-10 flex min-w-0 flex-1 items-center gap-1.5 px-2 text-left"
            onClick={onClick}
            type="button"
          >
            <FileIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              filename={file.filename}
              mimeType={file.mimeType}
            />
            <span className="truncate text-xs text-foreground/80">
              {file.filename}
            </span>
          </button>
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

      <div className="relative z-10 flex shrink-0 items-center pr-1 opacity-0 transition-opacity group-hover:opacity-100">
        <ConfirmedIconButton
          className="size-5 border border-border/50 bg-background hover:bg-accent! dark:hover:bg-accent!"
          icon={MessageSquare}
          onClick={handleAddToChat}
          successTooltip="Added to chat!"
          tooltip="Add to chat"
          variant="ghost"
        />
      </div>
    </div>
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
  icon: LucideIcon;
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
            "h-6 gap-1 px-2 text-xs text-muted-foreground",
            labelClassName,
          )}
        >
          <ChevronRight className="size-3 shrink-0 transition-transform" />
          <Icon className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ml-3 flex min-w-0 flex-col border-l border-border/50">
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
      <SidebarMenuItem>
        <FileRow
          file={node.file}
          isActive={node.file.filePath === activeFilePath}
          onClick={() => {
            onFileClick(node.file);
          }}
        />
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <CollapsibleTreeSection
        defaultOpen={defaultOpen}
        icon={Folder}
        label={node.name}
      >
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
