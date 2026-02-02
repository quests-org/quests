import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStickToBottom } from "use-stick-to-bottom";

import { useAppState } from "../hooks/use-app-state";
import { useContinueSession } from "../hooks/use-continue-session";
import { cn } from "../lib/utils";
import { rpcClient } from "../rpc/client";
import { ChatZeroState } from "./chat-zero-state";
import { PromptInput } from "./prompt-input";
import { SessionStream } from "./session-stream";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UsageSummary } from "./usage-summary";

export function ProjectChat({
  isChatOnly = false,
  project,
  selectedModelURI: initialSelectedModelURI,
  selectedSessionId,
  selectedVersion,
  showVersions,
}: {
  isChatOnly?: boolean;
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

  const [selectedModelURI, setSelectedModelURI] = useState<
    AIGatewayModelURI.Type | undefined
  >(initialSelectedModelURI);

  const { data: appState } = useAppState({
    subdomain: project.subdomain,
  });

  const messagesQuery = useQuery(
    rpcClient.workspace.message.live.listWithParts.experimental_liveOptions({
      enabled: !!selectedSessionId,
      input: selectedSessionId
        ? {
            sessionId: selectedSessionId,
            subdomain: project.subdomain,
          }
        : (undefined as never),
      retry: 1,
    }),
  );

  const messages = messagesQuery.data ?? [];
  const messageError = messagesQuery.error;
  const isLoadingMessages = messagesQuery.isLoading;
  const refetch = messagesQuery.refetch;

  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  const isDeveloperMode = preferences?.developerMode;

  useEffect(() => {
    setSelectedModelURI(initialSelectedModelURI);
  }, [initialSelectedModelURI]);

  const sessionActors = appState?.sessionActors ?? [];
  const isAgentAlive = sessionActors.some((session) =>
    session.tags.includes("agent.alive"),
  );
  const isAgentRunning = sessionActors.some(
    (s) =>
      s.sessionId === selectedSessionId && s.tags.includes("agent.running"),
  );

  const { handleContinue } = useContinueSession({
    modelURI: selectedModelURI,
    sessionId: selectedSessionId,
    subdomain: project.subdomain,
  });

  const handleRetry = (prompt?: string) => {
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
      prompt: prompt ?? "Try that again.",
      sessionId: selectedSessionId,
      subdomain: project.subdomain,
    });
  };

  const createEmptySessionMutation = useMutation(
    rpcClient.workspace.session.create.mutationOptions(),
  );

  const handleNewSession = () => {
    createEmptySessionMutation.mutate(
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

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-y-auto",
        isChatOnly ? "min-h-0 flex-1" : "h-full",
      )}
      ref={scrollRef}
    >
      <div
        className={cn(
          "flex w-full flex-col gap-4 p-4",
          isChatOnly && "mx-auto max-w-3xl",
        )}
        ref={contentRef}
      >
        {selectedSessionId ? (
          isLoadingMessages ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : messageError ? (
            <Alert className="mt-4" variant="warning">
              <AlertDescription className="flex flex-col gap-4">
                <div className="font-semibold">Failed to load messages</div>
                <div className="text-sm">
                  {messageError.message || "Unknown error occurred"}
                </div>
                <div className="flex gap-2">
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button onClick={handleNewSession} variant="secondary">
                        Start new chat
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Starts a fresh chat in this project</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button onClick={() => refetch()}>Retry</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Retry loading messages</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </AlertDescription>
            </Alert>
          ) : !isAgentRunning && messages.length === 0 ? (
            <ChatZeroState
              project={project}
              selectedSessionId={selectedSessionId}
            />
          ) : (
            <SessionStream
              isAgentRunning={isAgentRunning}
              messages={messages}
              onContinue={handleContinue}
              onModelChange={setSelectedModelURI}
              onRetry={handleRetry}
              onStartNewChat={handleNewSession}
              project={project}
              selectedVersion={selectedVersion}
            />
          )
        ) : (
          <ChatZeroState
            project={project}
            selectedSessionId={selectedSessionId}
          />
        )}
      </div>

      <div className="flex-1" />

      <div className="sticky bottom-0 flex w-full bg-background">
        {!isNearBottom && (
          <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center pb-4">
            <Button
              className="pointer-events-auto border border-border shadow-lg"
              onClick={() => scrollToBottom()}
              size="icon"
              variant="secondary"
            >
              <ChevronDown className="size-3" />
            </Button>
          </div>
        )}
        <div
          className={cn("w-full px-3 pb-3", isChatOnly && "mx-auto max-w-3xl")}
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
          {messages.length > 0 && isDeveloperMode && (
            <UsageSummary className="mt-2" messages={messages} />
          )}
        </div>
      </div>
    </div>
  );
}
