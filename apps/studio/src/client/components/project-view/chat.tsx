import { PromptInput } from "@/client/components/prompt-input";
import { SessionStream } from "@/client/components/session-stream";
import { Button } from "@/client/components/ui/button";
import { useAppState } from "@/client/hooks/use-app-state";
import { useContinueSession } from "@/client/hooks/use-continue-session";
import { createUserMessage } from "@/client/lib/create-user-message";
import { rpcClient } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
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

  if (initialSelectedModelURI && selectedModelURI !== initialSelectedModelURI) {
    setSelectedModelURI(initialSelectedModelURI);
  }

  const sessionActors = appState?.sessionActors ?? [];
  const isAgentAlive = sessionActors.some((session) =>
    session.tags.includes("agent.alive"),
  );

  const { handleContinue } = useContinueSession({
    agentName: "chat",
    modelURI: selectedModelURI,
    sessionId: selectedSessionId,
    subdomain: project.subdomain,
  });

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
    <div className="flex flex-1 flex-col overflow-hidden border-t">
      <div
        className="flex flex-1 items-start justify-center overflow-y-auto"
        ref={scrollRef}
      >
        <div className="flex min-h-full w-full max-w-3xl flex-col bg-background">
          <div className="flex-1 p-4">
            <div className="flex flex-col gap-4" ref={contentRef}>
              {selectedSessionId && (
                <SessionStream
                  onContinue={handleContinue}
                  project={project}
                  sessionId={selectedSessionId}
                  showMessageActions
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
                bottom: `${bottomSectionHeight + 48}px`,
              }}
              variant="secondary"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}

          <div
            className="sticky bottom-0 bg-background p-4"
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
              onSubmit={({ agentName, files, modelURI, prompt }) => {
                if (!selectedSessionId) {
                  return;
                }

                const { files: mappedFiles, message } = createUserMessage({
                  files,
                  prompt,
                  sessionId: selectedSessionId,
                });

                if (
                  message.parts.length === 0 &&
                  (!mappedFiles || mappedFiles.length === 0)
                ) {
                  return;
                }

                createMessage.mutate(
                  {
                    agentName,
                    files: mappedFiles,
                    message,
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
