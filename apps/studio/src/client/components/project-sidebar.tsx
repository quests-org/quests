import { type AIGatewayModel } from "@quests/ai-gateway";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { StoreId } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useStickToBottom } from "use-stick-to-bottom";

import { useAppState } from "../hooks/use-app-state";
import { rpcClient } from "../rpc/client";
import { PromptInput } from "./prompt-input";
import { SessionMenu } from "./session-menu";
import { type FilterMode, SessionStream } from "./session-stream";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface ProjectSidebarProps {
  collapsed?: boolean;
  project: WorkspaceAppProject;
  selectedModelURI?: AIGatewayModel.URI;
  selectedVersion?: string;
}

export function ProjectSidebar({
  collapsed = false,
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
    AIGatewayModel.URI | undefined
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

  const handleContinue = () => {
    if (!selectedSessionId || !selectedModelURI) {
      return;
    }

    const messageId = StoreId.newMessageId();
    const createdAt = new Date();

    createMessage.mutate(
      {
        message: {
          id: messageId,
          metadata: {
            createdAt,
            sessionId: selectedSessionId,
          },
          parts: [
            {
              metadata: {
                createdAt,
                id: StoreId.newPartId(),
                messageId,
                sessionId: selectedSessionId,
              },
              text: "Continue",
              type: "text",
            },
          ],
          role: "user",
        },
        modelURI: selectedModelURI,
        sessionId: selectedSessionId,
        subdomain: project.subdomain,
      },
      {
        onSuccess: () => {
          setFilterMode("chat");
        },
      },
    );
  };

  const handleNewSession = () => {
    createEmptySession.mutate(
      { subdomain: project.subdomain },
      {
        onError: () => {
          toast.error("Failed to create new chat");
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
    <div
      className={`bg-background flex flex-col relative transition-all duration-300 ease-in-out ${
        collapsed ? "w-0 overflow-hidden" : "w-96 shrink-0"
      }`}
    >
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
            <Button
              disabled={createEmptySession.isPending}
              onClick={handleNewSession}
              size="sm"
              title="New Chat"
              variant="ghost"
            >
              <Plus className="size-4" />
            </Button>
            <SessionMenu project={project} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4" ref={contentRef}>
          {selectedSessionId ? (
            <SessionStream
              app={project}
              filterMode={filterMode}
              onContinue={handleContinue}
              selectedVersion={selectedVersion}
              sessionId={selectedSessionId}
            />
          ) : (
            <div className="flex items-center justify-center h-32">
              <div>No chat selected</div>
            </div>
          )}
        </div>
      </div>

      {!isNearBottom && (
        <Button
          className="absolute left-1/2 transform -translate-x-1/2 z-10 shadow-lg border border-border"
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

      <div className="p-4 border-t" ref={bottomSectionRef}>
        <PromptInput
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
          onSubmit={({ modelURI, prompt }) => {
            const promptText = prompt.trim();
            const messageId = StoreId.newMessageId();
            const createdAt = new Date();

            if (selectedSessionId) {
              createMessage.mutate(
                {
                  message: {
                    id: messageId,
                    metadata: {
                      createdAt,
                      sessionId: selectedSessionId,
                    },
                    parts: [
                      {
                        metadata: {
                          createdAt,
                          id: StoreId.newPartId(),
                          messageId,
                          sessionId: selectedSessionId,
                        },
                        text: promptText,
                        type: "text",
                      },
                    ],
                    role: "user",
                  },
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
              const sessionId = StoreId.newSessionId();

              createSessionWithMessage.mutate(
                {
                  message: {
                    id: messageId,
                    metadata: {
                      createdAt,
                      sessionId,
                    },
                    parts: [
                      {
                        metadata: {
                          createdAt,
                          id: StoreId.newPartId(),
                          messageId,
                          sessionId,
                        },
                        text: promptText,
                        type: "text",
                      },
                    ],
                    role: "user",
                  },
                  modelURI,
                  sessionId,
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
                        selectedSessionId: sessionId,
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
          ref={promptInputRef}
        />
      </div>
    </div>
  );
}
