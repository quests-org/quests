import { StoreId, type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bug,
  ChevronDown,
  Copy,
  MessageCircle,
  Pencil,
  Plus,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";
import { AppIcon } from "./app-icon";
import { JsonViewer } from "./json-viewer";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ProjectMenu({
  onSettingsClick,
  project,
  selectedSessionId,
}: {
  onSettingsClick: () => void;
  project: WorkspaceAppProject;
  selectedSessionId?: StoreId.Session;
}) {
  const navigate = useNavigate();

  const { data: sessions = [] } = useQuery(
    rpcClient.workspace.session.live.list.experimental_liveOptions({
      input: { subdomain: project.subdomain },
    }),
  );
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );

  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [jsonViewerData, setJsonViewerData] = useState<unknown>(null);

  const createEmptySession = useMutation(
    rpcClient.workspace.session.create.mutationOptions(),
  );

  const handleNewChat = () => {
    createEmptySession.mutate(
      { subdomain: project.subdomain },
      {
        onError: (error) => {
          toast.error("Failed to create new chat", {
            description: error.message,
          });
        },
        onSuccess: (result) => {
          void navigate({
            params: {
              subdomain: project.subdomain,
            },
            replace: true,
            search: (prev) => ({
              ...prev,
              selectedSessionId: result.id,
            }),
            to: "/projects/$subdomain",
          });
        },
      },
    );
  };

  const handleDebugChat = async () => {
    if (!selectedSessionId) {
      return;
    }

    try {
      const result =
        await rpcClient.workspace.session.byIdWithMessagesAndParts.call({
          sessionId: selectedSessionId,
          subdomain: project.subdomain,
        });

      setJsonViewerData(result);
      setShowJsonViewer(true);
    } catch {
      toast.error("Failed to load chat data");
    }
  };

  const showChatsSubmenu = sessions.length > 1;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="h-auto max-w-80 min-w-0 justify-start gap-2 py-1 font-semibold text-foreground hover:bg-accent hover:text-accent-foreground has-[>svg]:px-1"
            variant="ghost"
          >
            <AppIcon name={project.iconName} size="sm" />
            <span className="truncate">{project.title}</span>
            <ChevronDown className="size-3 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            onClick={() => {
              void navigate({
                from: "/projects/$subdomain",
                params: { subdomain: project.subdomain },
                search: (prev) => ({ ...prev, showDuplicate: true }),
              });
            }}
          >
            <Copy className="size-4" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSettingsClick}>
            <Pencil className="size-4" />
            <span>Rename</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem
                disabled={createEmptySession.isPending}
                onClick={handleNewChat}
              >
                <Plus className="size-4" />
                <span>New chat</span>
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent>Start a fresh chat in this project.</TooltipContent>
          </Tooltip>

          {showChatsSubmenu && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4" />
                  Chats
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  onValueChange={(value) => {
                    const sessionId = StoreId.SessionSchema.parse(value);
                    void navigate({
                      params: {
                        subdomain: project.subdomain,
                      },
                      replace: true,
                      search: (prev) => ({
                        ...prev,
                        selectedSessionId: sessionId,
                      }),
                      to: "/projects/$subdomain",
                    });
                  }}
                  value={selectedSessionId}
                >
                  {sessions.map((session) => (
                    <DropdownMenuRadioItem key={session.id} value={session.id}>
                      {session.title || "Untitled Chat"}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {preferences?.developerMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-warning-foreground"
                disabled={!selectedSessionId}
                onClick={handleDebugChat}
              >
                <Bug className="size-4 text-warning-foreground" />
                Debug chat
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              void navigate({
                from: "/projects/$subdomain",
                params: { subdomain: project.subdomain },
                search: (prev) => ({ ...prev, showDelete: true }),
              });
            }}
            variant="destructive"
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JsonViewer
        data={jsonViewerData}
        downloadFilename="chat"
        onOpenChange={setShowJsonViewer}
        open={showJsonViewer}
        title="Chat Data"
      />
    </>
  );
}
