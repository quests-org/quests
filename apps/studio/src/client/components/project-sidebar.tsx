import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { StoreId, type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useStickToBottom } from "use-stick-to-bottom";

import { useAppState } from "../hooks/use-app-state";
import { useContinueSession } from "../hooks/use-continue-session";
import { createUserMessage } from "../lib/create-user-message";
import { rpcClient } from "../rpc/client";
import { ChatZeroState } from "./chat-zero-state";
import { PromptInput } from "./prompt-input";
import { SessionMenu } from "./session-menu";
import { type FilterMode, SessionStream } from "./session-stream";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { VersionList } from "./version-list";

interface ProjectSidebarProps {
  project: WorkspaceAppProject;
  selectedModelURI?: AIGatewayModelURI.Type;
  selectedVersion?: string;
}

export function ProjectSidebar({
  project,
  selectedModelURI: initialSelectedModelURI,
  selectedVersion,
}: ProjectSidebarProps) {
  const { selectedSessionId } = useSearch({
    from: "/_app/projects/$subdomain/",
  });
  const navigate = useNavigate();

  const { contentRef, isNearBottom, scrollRef, scrollToBottom } =
    // Less animation when sticking to bottom
    useStickToBottom({ mass: 0.8 });
  const createSessionWithMessage = useMutation(
    rpcClient.workspace.session.createWithMessage.mutationOptions(),
  );
  const createMessage = useMutation(
    rpcClient.workspace.message.create.mutationOptions(),
  );
  const stopSessions = useMutation(
    rpcClient.workspace.session.stop.mutationOptions(),
  );
  const createEmptySession = useMutation(
    rpcClient.workspace.session.create.mutationOptions(),
  );

  const bottomSectionRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<{ focus: () => void }>(null);
  const [bottomSectionHeight, setBottomSectionHeight] = useState(0);
  const [filterMode, setFilterMode] = useState<FilterMode>("chat");
  const [selectedModelURI, setSelectedModelURI] = useState<
    AIGatewayModelURI.Type | undefined
  >(initialSelectedModelURI);

  const { data: appState } = useAppState({
    subdomain: project.subdomain,
  });

  useEffect(() => {
    setSelectedModelURI(initialSelectedModelURI);
  }, [initialSelectedModelURI]);

  const sessionActors = appState?.sessionActors ?? [];
  const isAgentAlive = sessionActors.some((session) =>
    session.tags.includes("agent.alive"),
  );

  const { handleContinue } = useContinueSession({
    modelURI: selectedModelURI,
    onSuccess: () => {
      setFilterMode("chat");
    },
    sessionId: selectedSessionId,
    subdomain: project.subdomain,
  });

  const handleNewSession = () => {
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
          }).then(() => {
            promptInputRef.current?.focus();
          });
        },
      },
    );
  };

  useEffect(() => {
    if (!bottomSectionRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBottomSectionHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(bottomSectionRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative flex size-full flex-col bg-background transition-all duration-300 ease-in-out">
      <div className="p-2">
        <div className="flex items-center justify-between gap-2">
          <Tabs
            onValueChange={(value) => {
              setFilterMode(value as FilterMode);
            }}
            value={filterMode}
          >
            <TabsList>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled={createEmptySession.isPending || isAgentAlive}
                  onClick={handleNewSession}
                  size="sm"
                  variant="ghost"
                >
                  <Plus className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New chat in this project</p>
              </TooltipContent>
            </Tooltip>
            <SessionMenu project={project} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4" ref={contentRef}>
          {filterMode === "versions" ? (
            <VersionList
              projectSubdomain={project.subdomain}
              selectedVersion={selectedVersion}
            />
          ) : selectedSessionId ? (
            <SessionStream
              onContinue={handleContinue}
              project={project}
              selectedVersion={selectedVersion}
              sessionId={selectedSessionId}
              showMessageActions={false}
            />
          ) : (
            <ChatZeroState
              project={project}
              selectedSessionId={selectedSessionId}
            />
          )}
        </div>
      </div>

      {!isNearBottom && (
        <Button
          className="absolute left-1/2 z-10 -translate-x-1/2 transform border border-border shadow-lg"
          onClick={() => scrollToBottom()}
          size="icon"
          style={{
            bottom: `${bottomSectionHeight + 48}px`, // 16px gap above the bottom section
          }}
          variant="secondary"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      )}

      {filterMode === "chat" && (
        <div className="px-2 pb-4" ref={bottomSectionRef}>
          <PromptInput
            atomKey={project.subdomain}
            autoFocus
            isLoading={
              createSessionWithMessage.isPending || createMessage.isPending
            }
            isStoppable={isAgentAlive}
            isSubmittable={!isAgentAlive}
            modelURI={selectedModelURI}
            onModelChange={setSelectedModelURI}
            onStop={() => {
              stopSessions.mutate({ subdomain: project.subdomain });
            }}
            onSubmit={({ files, modelURI, prompt }) => {
              const targetSessionId =
                selectedSessionId ?? StoreId.newSessionId();

              const { files: mappedFiles, message } = createUserMessage({
                files,
                prompt,
                sessionId: targetSessionId,
              });

              if (
                message.parts.length === 0 &&
                (!mappedFiles || mappedFiles.length === 0)
              ) {
                return;
              }

              if (selectedSessionId) {
                createMessage.mutate(
                  {
                    files: mappedFiles,
                    message,
                    modelURI,
                    sessionId: selectedSessionId,
                    subdomain: project.subdomain,
                  },
                  {
                    onSuccess: () => {
                      setFilterMode("chat");
                      void scrollToBottom();
                      if (selectedVersion) {
                        void navigate({
                          params: {
                            subdomain: project.subdomain,
                          },
                          replace: true,
                          search: (prev) => ({
                            ...prev,
                            selectedVersion: undefined,
                          }),
                          to: "/projects/$subdomain",
                        });
                      }
                    },
                  },
                );
              } else {
                createSessionWithMessage.mutate(
                  {
                    files: mappedFiles,
                    message,
                    modelURI,
                    sessionId: targetSessionId,
                    subdomain: project.subdomain,
                  },
                  {
                    onSuccess: () => {
                      setFilterMode("chat");
                      void scrollToBottom();
                      void navigate({
                        params: {
                          subdomain: project.subdomain,
                        },
                        replace: true,
                        search: (prev) => ({
                          ...prev,
                          selectedSessionId: targetSessionId,
                          selectedVersion: selectedVersion
                            ? undefined
                            : prev.selectedVersion,
                        }),
                        to: "/projects/$subdomain",
                      });
                    },
                  },
                );
              }
            }}
            placeholder="Type, paste, or drop some files here…"
            ref={promptInputRef}
          />
        </div>
      )}
    </div>
  );
}
