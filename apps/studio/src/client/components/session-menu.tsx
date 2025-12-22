import { StoreId, type WorkspaceAppProject } from "@quests/workspace/client";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Bug, History, MoreVertical, TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { rpcClient, vanillaRpcClient } from "../rpc/client";
import { JsonViewer } from "./json-viewer";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
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

interface SessionMenuProps {
  project: WorkspaceAppProject;
}

export function SessionMenu({ project }: SessionMenuProps) {
  const { data: sessions = [] } = useQuery(
    rpcClient.workspace.session.live.list.experimental_liveOptions({
      input: { subdomain: project.subdomain },
    }),
  );
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  const { selectedSessionId } = useSearch({
    from: "/_app/projects/$subdomain/",
  });
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionIdToDelete, setSessionIdToDelete] = useState<StoreId.Session>();
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [jsonViewerData, setJsonViewerData] = useState<unknown>(null);

  const removeSessionMutation = useMutation(
    rpcClient.workspace.session.remove.mutationOptions(),
  );

  const { data: sessionToDeleteData } = useQuery({
    ...rpcClient.workspace.session.byIdWithMessagesAndParts.queryOptions({
      input: sessionIdToDelete
        ? {
            sessionId: sessionIdToDelete,
            subdomain: project.subdomain,
          }
        : skipToken,
    }),
  });

  const handleDeleteSession = () => {
    if (!selectedSessionId) {
      return;
    }
    setSessionIdToDelete(selectedSessionId);
    setShowDeleteModal(true);
  };

  const handleDebugChat = async () => {
    if (!selectedSessionId) {
      return;
    }

    try {
      const result =
        await vanillaRpcClient.workspace.session.byIdWithMessagesAndParts({
          sessionId: selectedSessionId,
          subdomain: project.subdomain,
        });

      setJsonViewerData(result);
      setShowJsonViewer(true);
    } catch {
      toast.error("Failed to load chat data");
    }
  };

  const confirmDeleteSession = () => {
    if (!sessionIdToDelete) {
      return;
    }

    removeSessionMutation.mutate(
      {
        sessionId: sessionIdToDelete,
        subdomain: project.subdomain,
      },
      {
        onError: () => {
          toast.error("Failed to delete chat");
        },
        onSuccess: () => {
          setShowDeleteModal(false);
          setSessionIdToDelete(undefined);

          if (selectedSessionId === sessionIdToDelete) {
            const remainingSessions = sessions.filter(
              (s) => s.id !== sessionIdToDelete,
            );
            const newSessionId =
              remainingSessions.length > 0
                ? remainingSessions.at(-1)?.id
                : undefined;

            void navigate({
              params: {
                subdomain: project.subdomain,
              },
              replace: true,
              search: (prev) => ({
                ...prev,
                selectedSessionId: newSessionId,
              }),
              to: "/projects/$subdomain",
            });
          }

          toast.success("Chat deleted successfully");
        },
      },
    );
  };

  const sessionToDeleteInfo = sessionToDeleteData
    ? (() => {
        const session = sessionToDeleteData;
        const messageCount = session.messages.length;
        const userMessages = session.messages.filter(
          (m) => m.role === "user",
        ).length;
        const assistantMessages = session.messages.filter(
          (m) => m.role === "assistant",
        ).length;

        return {
          assistantMessages,
          createdAt: session.createdAt,
          messageCount,
          title: session.title || "Untitled Chat",
          userMessages,
        };
      })()
    : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {sessions.length > 0 ? (
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
              ) : (
                <DropdownMenuItem disabled>No chats found</DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          {preferences?.developerMode && (
            <DropdownMenuItem
              className="text-warning-foreground"
              disabled={!selectedSessionId}
              onClick={handleDebugChat}
            >
              <Bug className="h-4 w-4 text-warning-foreground" />
              Debug chat
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={!selectedSessionId || removeSessionMutation.isPending}
            onClick={handleDeleteSession}
            variant="destructive"
          >
            <TrashIcon className="size-4" />
            Delete Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setShowDeleteModal} open={showDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete chat</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Are you sure you want to delete this chat? This action cannot
                  be undone.
                </p>
                {sessionToDeleteInfo && (
                  <div className="mt-3 rounded-md bg-muted p-3 text-sm">
                    <div className="mb-2 font-medium">
                      &ldquo;{sessionToDeleteInfo.title}&rdquo;
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div>
                        {sessionToDeleteInfo.messageCount} total message
                        {sessionToDeleteInfo.messageCount === 1 ? "" : "s"}
                      </div>
                      <div>
                        {sessionToDeleteInfo.userMessages} user message
                        {sessionToDeleteInfo.userMessages === 1
                          ? ""
                          : "s"} • {sessionToDeleteInfo.assistantMessages}{" "}
                        assistant message
                        {sessionToDeleteInfo.assistantMessages === 1 ? "" : "s"}
                      </div>
                      <div>
                        Created{" "}
                        {sessionToDeleteInfo.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              disabled={removeSessionMutation.isPending}
              onClick={() => {
                setShowDeleteModal(false);
                setSessionIdToDelete(undefined);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={removeSessionMutation.isPending}
              onClick={confirmDeleteSession}
              variant="destructive"
            >
              {removeSessionMutation.isPending ? "Deleting..." : "Delete Chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
