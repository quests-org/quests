import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useStickToBottom } from "use-stick-to-bottom";

import { useAppState } from "../hooks/use-app-state";
import { useContinueSession } from "../hooks/use-continue-session";
import { cn } from "../lib/utils";
import { rpcClient } from "../rpc/client";
import { ChatZeroState } from "./chat-zero-state";
import { ProjectSessionStream } from "./project-session-stream";
import { PromptInput } from "./prompt-input";
import { Button } from "./ui/button";

export function ProjectChat({
  isStandalone = false,
  project,
  selectedModelURI: initialSelectedModelURI,
  selectedSessionId,
  selectedVersion,
  showVersions,
}: {
  isStandalone?: boolean;
  project: WorkspaceAppProject;
  selectedModelURI?: AIGatewayModelURI.Type;
  selectedSessionId?: StoreId.Session;
  selectedVersion?: string;
  showVersions?: boolean;
}) {
  const navigate = useNavigate();

  const { contentRef, isNearBottom, scrollRef, scrollToBottom } =
    // Less animation when sticking to bottom
    useStickToBottom({ mass: 0.8 });
  const createMessage = useMutation(
    rpcClient.workspace.message.create.mutationOptions({
      onError: (error) => {
        toast.error("Failed to create message", { description: error.message });
      },
    }),
  );
  const stopSessions = useMutation(
    rpcClient.workspace.session.stop.mutationOptions(),
  );

  const bottomSectionRef = useRef<HTMLDivElement>(null);
  const [bottomSectionHeight, setBottomSectionHeight] = useState(0);
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
    sessionId: selectedSessionId,
    subdomain: project.subdomain,
  });

  const handleRetry = () => {
    if (!selectedSessionId) {
      // No retry UI is shown when no session is selected
      return;
    }
    if (!selectedModelURI) {
      toast.error("Failed to retry", { description: "No model selected" });
      return;
    }
    createMessage.mutate({
      modelURI: selectedModelURI,
      prompt: "Try that again.",
      sessionId: selectedSessionId,
      subdomain: project.subdomain,
    });
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
    <div className="relative flex size-full flex-col">
      <div
        className={cn("flex-1 px-2", !isStandalone && "overflow-y-auto")}
        ref={scrollRef}
      >
        <div
          className={cn(
            "flex flex-col gap-4",
            isStandalone && "mx-auto w-full max-w-3xl",
          )}
          ref={contentRef}
        >
          {selectedSessionId ? (
            <ProjectSessionStream
              onContinue={handleContinue}
              onModelChange={setSelectedModelURI}
              onRetry={handleRetry}
              project={project}
              selectedVersion={selectedVersion}
              sessionId={selectedSessionId}
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

      <div
        className={cn(
          "bg-background px-2 pb-4",
          isStandalone &&
            // Create a custom breakpoint that is max-w-3xl + px-2 (0.5rem * 2)
            "sticky bottom-0 mx-auto w-full max-w-3xl min-[calc(48rem+1rem)]:px-0",
        )}
        ref={bottomSectionRef}
      >
        <PromptInput
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
          onSubmit={({ files, modelURI, prompt }) => {
            createMessage.mutate(
              {
                files,
                modelURI,
                prompt,
                sessionId: selectedSessionId,
                subdomain: project.subdomain,
              },
              {
                onSuccess: ({ sessionId }) => {
                  void scrollToBottom();
                  if (selectedVersion || showVersions) {
                    void navigate({
                      params: {
                        subdomain: project.subdomain,
                      },
                      replace: true,
                      search: (prev) => ({
                        ...prev,
                        selectedSessionId: sessionId,
                        selectedVersion: undefined,
                        showVersions: undefined,
                      }),
                      to: "/projects/$subdomain",
                    });
                  }
                },
              },
            );
          }}
          placeholder="Type, paste, or drop some files here…"
        />
      </div>
    </div>
  );
}
