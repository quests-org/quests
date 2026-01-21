import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { useAppState } from "../hooks/use-app-state";
import { rpcClient } from "../rpc/client";
import { ChatZeroState } from "./chat-zero-state";
import { SessionStream } from "./session-stream";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ProjectSessionStreamProps {
  onContinue: () => void;
  onModelChange: (modelURI: AIGatewayModelURI.Type) => void;
  onRetry: () => void;
  project: WorkspaceAppProject;
  selectedVersion?: string;
  sessionId: StoreId.Session;
}

export function ProjectSessionStream({
  onContinue,
  onModelChange,
  onRetry,
  project,
  selectedVersion,
  sessionId,
}: ProjectSessionStreamProps) {
  const {
    data: messages = [],
    error: messageError,
    isLoading,
  } = useQuery(
    rpcClient.workspace.message.live.listWithParts.experimental_liveOptions({
      input: {
        sessionId,
        subdomain: project.subdomain,
      },
    }),
  );

  const { data: appState } = useAppState({ subdomain: project.subdomain });
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  const isDeveloperMode = preferences?.developerMode;
  const navigate = useNavigate();

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

  const isAgentRunning = (appState?.sessionActors ?? []).some(
    (s) => s.sessionId === sessionId && s.tags.includes("agent.running"),
  );
  const isAgentAlive = (appState?.sessionActors ?? []).some((s) =>
    s.tags.includes("agent.alive"),
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messageError) {
    return (
      <Alert className="mt-4" variant="warning">
        <AlertDescription className="flex flex-col gap-4">
          <div className="font-semibold">Failed to load messages</div>
          <div className="text-sm">
            {messageError.message || "Unknown error occurred"}
          </div>
          <div>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button onClick={handleNewSession}>Start new chat</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Starts a fresh chat in this project</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!isAgentRunning && messages.length === 0) {
    return <ChatZeroState project={project} selectedSessionId={sessionId} />;
  }

  return (
    <SessionStream
      isAgentAlive={isAgentAlive}
      isAgentRunning={isAgentRunning}
      isDeveloperMode={isDeveloperMode}
      messages={messages}
      onContinue={onContinue}
      onModelChange={onModelChange}
      onRetry={onRetry}
      onStartNewChat={handleNewSession}
      project={project}
      selectedVersion={selectedVersion}
    />
  );
}
