import { PromptInput } from "@/client/components/prompt-input";
import { SessionStream } from "@/client/components/session-stream";
import { Button } from "@/client/components/ui/button";
import { useAppState } from "@/client/hooks/use-app-state";
import { rpcClient } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { StoreId, type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

export function ProjectViewChat({
  project,
  selectedModelURI: initialSelectedModelURI,
  selectedSessionId,
}: {
  project: WorkspaceAppProject;
  selectedModelURI: AIGatewayModelURI.Type | undefined;
  selectedSessionId: StoreId.Session | undefined;
}) {
  const { contentRef, isNearBottom, scrollRef, scrollToBottom } =
    useStickToBottom({ mass: 0.8 });

  const createMessage = useMutation(
    rpcClient.workspace.message.create.mutationOptions(),
  );
  const stopSessions = useMutation(
    rpcClient.workspace.session.stop.mutationOptions(),
  );

  const bottomSectionRef = useRef<HTMLDivElement>(null);
  const promptInputRef = useRef<{ focus: () => void }>(null);
  const [bottomSectionHeight, setBottomSectionHeight] = useState(0);
  const [selectedModelURI, setSelectedModelURI] = useState<
    AIGatewayModelURI.Type | undefined
  >(initialSelectedModelURI);

  const { data: appState } = useAppState({
    subdomain: project.subdomain,
  });

  useEffect(() => {
    if (initialSelectedModelURI) {
      setSelectedModelURI(initialSelectedModelURI);
    }
  }, [initialSelectedModelURI]);

  const sessionActors = appState?.sessionActors ?? [];
  const isAgentAlive = sessionActors.some((session) =>
    session.tags.includes("agent.alive"),
  );

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
    <div className="flex-1 flex flex-col border-t overflow-hidden">
      <div
        className="flex-1 flex items-start justify-center overflow-y-auto"
        ref={scrollRef}
      >
        <div className="flex flex-col w-full max-w-3xl bg-background">
          <div className="p-4">
            <div className="flex flex-col gap-4" ref={contentRef}>
              {selectedSessionId && (
                <SessionStream
                  app={project}
                  sessionId={selectedSessionId}
                  showMessageActions
                />
              )}
            </div>
          </div>

          {!isNearBottom && (
            <Button
              className="absolute left-1/2 transform -translate-x-1/2 z-10 shadow-lg border border-border"
              onClick={() => scrollToBottom()}
              size="icon"
              style={{
                bottom: `${bottomSectionHeight + 48}px`,
              }}
              variant="secondary"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}

          <div
            className="sticky bottom-0 p-4 bg-background"
            ref={bottomSectionRef}
          >
            <PromptInput
              agentName="chat"
              atomKey={project.subdomain}
              autoFocus
              isLoading={createMessage.isPending}
              isStoppable={isAgentAlive}
              isSubmittable={!isAgentAlive}
              modelURI={selectedModelURI}
              onModelChange={setSelectedModelURI}
              onStop={() => {
                stopSessions.mutate({ subdomain: project.subdomain });
              }}
              onSubmit={({ agentName, modelURI, prompt }) => {
                if (!selectedSessionId) {
                  return;
                }

                const promptText = prompt.trim();
                const messageId = StoreId.newMessageId();
                const createdAt = new Date();

                createMessage.mutate(
                  {
                    agentName,
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
                      void scrollToBottom();
                    },
                  },
                );
              }}
              placeholder="Continue the conversation…"
              ref={promptInputRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
