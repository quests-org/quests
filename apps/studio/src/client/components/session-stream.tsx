import {
  type SessionMessage,
  SessionMessagePart,
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAppState } from "../hooks/use-app-state";
import { rpcClient } from "../rpc/client";
import { AssistantMessage } from "./assistant-message";
import { ChatErrorAlert } from "./chat-error-alert";
import { ChatZeroState } from "./chat-zero-state";
import { ContextMessages } from "./context-messages";
import { DebugWrapper } from "./debug-wrapper";
import { GitCommitCard } from "./git-commit-card";
import { MessageError } from "./message-error";
import { ReasoningMessage } from "./reasoning-message";
import { ContextMessage } from "./session-context-message";
import { ToolPart } from "./tool-part";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { UnknownPart } from "./unknown-part";
import { UsageSummary } from "./usage-summary";
import { UserMessage } from "./user-message";
import { VersionList } from "./version-list";

export type FilterMode = "chat" | "versions";

interface SessionEventListProps {
  app: WorkspaceAppProject;
  filterMode: FilterMode;
  onContinue?: () => void;
  selectedVersion?: string;
  sessionId: StoreId.Session;
}

export function SessionStream({
  app,
  filterMode,
  onContinue,
  selectedVersion,
  sessionId,
}: SessionEventListProps) {
  const {
    data: messages = [],
    error,
    isLoading,
  } = useQuery(
    rpcClient.workspace.message.live.listWithParts.experimental_liveOptions({
      input: {
        sessionId,
        subdomain: app.subdomain,
      },
    }),
  );
  const { selectedSessionId } = useSearch({
    from: "/_app/projects/$subdomain/",
  });
  const { data: appState } = useAppState({ subdomain: app.subdomain });
  const navigate = useNavigate();

  const createEmptySessionMutation = useMutation(
    rpcClient.workspace.session.create.mutationOptions(),
  );

  const handleNewSession = () => {
    createEmptySessionMutation.mutate(
      { subdomain: app.subdomain },
      {
        onError: () => {
          toast.error("Failed to create new chat");
        },
        onSuccess: (result) => {
          void navigate({
            params: {
              subdomain: app.subdomain,
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

  const isAnyAgentRunning = (appState?.sessionActors ?? []).some(
    (s) =>
      s.sessionId === selectedSessionId && s.tags.includes("agent.running"),
  );
  const isAnyActorActive =
    appState?.checkoutVersionRefActor.status === "active" ||
    appState?.createPreviewRefActor.status === "active";
  const isActive = isAnyAgentRunning || isAnyActorActive;
  const isAnyAgentAlive = (appState?.sessionActors ?? []).some((s) =>
    s.tags.includes("agent.alive"),
  );

  const gitCommitParts = useMemo(() => {
    return messages.flatMap((message) =>
      message.parts.filter((part) => part.type === "data-gitCommit"),
    );
  }, [messages]);

  const renderChatPart = useCallback(
    (
      part: SessionMessagePart.Type,
      message: SessionMessage.WithParts,
      partIndex: number,
    ): null | React.ReactNode => {
      if (part.type === "text") {
        if (part.state === "done" && part.text.trim() === "") {
          return null;
        }

        switch (message.role) {
          case "assistant": {
            return <AssistantMessage key={part.metadata.id} part={part} />;
          }
          case "session-context": {
            return (
              <ContextMessage
                key={part.metadata.id}
                message={message}
                part={part}
              />
            );
          }
          case "user": {
            return <UserMessage key={part.metadata.id} part={part} />;
          }
          default: {
            return null;
          }
        }
      }

      if (part.type === "step-start") {
        return null;
      }

      if (part.type === "data-gitCommit") {
        const lastGitCommitPart = gitCommitParts.at(-1);
        const isLastVersion = lastGitCommitPart?.data.ref === part.data.ref;
        return (
          <GitCommitCard
            isLastGitCommit={isLastVersion}
            isSelected={
              selectedVersion === part.data.ref ||
              (isLastVersion && !selectedVersion)
            }
            key={part.metadata.id}
            projectSubdomain={app.subdomain}
            restoredFromRef={part.data.restoredFromRef}
            versionRef={part.data.ref}
          />
        );
      }

      if (SessionMessagePart.isToolPart(part)) {
        return (
          <ToolPart
            isAgentRunning={isAnyAgentRunning}
            key={part.metadata.id}
            part={part}
          />
        );
      }

      if (part.type === "reasoning") {
        return (
          <ReasoningMessage
            createdAt={part.metadata.createdAt}
            endedAt={part.metadata.endedAt}
            isAgentRunning={isAnyAgentRunning}
            isStreaming={part.state === "streaming"}
            key={part.metadata.id}
            text={part.text}
          />
        );
      }

      if (
        part.type === "file" ||
        part.type === "source-document" ||
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        part.type === "source-url"
      ) {
        // eslint-disable-next-line no-console
        console.warn("File part not supported yet", part);
        return null;
      }

      const _exhaustiveCheck: never = part;
      return <UnknownPart key={partIndex} part={_exhaustiveCheck} />;
    },
    [gitCommitParts, selectedVersion, app.subdomain, isAnyAgentRunning],
  );

  const { contextMessages, regularMessages } = useMemo(() => {
    const result = {
      contextMessages: [] as SessionMessage.ContextWithParts[],
      regularMessages: [] as SessionMessage.WithParts[],
    };

    for (const message of messages) {
      if (message.role === "session-context") {
        result.contextMessages.push(message);
      } else {
        result.regularMessages.push(message);
      }
    }

    return result;
  }, [messages]);

  const { chatElements } = useMemo(() => {
    const newChatElements: React.ReactNode[] = [];
    let lastSummaryEndIndex = 0;

    for (const [messageIndex, message] of regularMessages.entries()) {
      if (message.role === "user" && messageIndex > 0) {
        const messagesForSummary = regularMessages.slice(
          lastSummaryEndIndex,
          messageIndex,
        );
        if (messagesForSummary.length > 0) {
          newChatElements.push(
            <DebugWrapper
              data={messagesForSummary}
              key={`usage-before-${message.id}`}
              label="usage-summary"
            >
              <UsageSummary
                key={`usage-before-${message.id}`}
                messages={messagesForSummary}
              />
            </DebugWrapper>,
          );
          lastSummaryEndIndex = messageIndex;
        }
      }

      const messageElements: React.ReactNode[] = [];
      for (const [partIndex, part] of message.parts.entries()) {
        const rendered = renderChatPart(part, message, partIndex);
        if (rendered) {
          messageElements.push(
            <DebugWrapper data={part} key={part.metadata.id} label={part.type}>
              {rendered}
            </DebugWrapper>,
          );
        }
      }

      if (message.role === "assistant" && message.metadata.error) {
        const isLastMessage = messageIndex === regularMessages.length - 1;
        messageElements.push(
          <DebugWrapper
            data={message.metadata.error}
            key={`error-${message.id}`}
            label="error"
          >
            <MessageError
              defaultExpanded={
                isLastMessage &&
                !isAnyAgentRunning &&
                message.metadata.error.kind !== "aborted"
              }
              error={message.metadata.error}
              key={`error-${message.id}`}
            />
          </DebugWrapper>,
        );
      }

      newChatElements.push(...messageElements);
    }

    return {
      chatElements: newChatElements,
    };
  }, [regularMessages, renderChatPart, isAnyAgentRunning]);

  const shouldShowErrorRecoveryPrompt = useMemo(() => {
    if (filterMode !== "chat" || messages.length === 0 || isAnyAgentRunning) {
      return false;
    }

    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }
    if (lastUserMessageIndex === -1) {
      return false;
    }

    const messagesSinceLastUser = messages.slice(lastUserMessageIndex + 1);
    return messagesSinceLastUser.some(
      (message) =>
        message.role === "assistant" &&
        message.metadata.error &&
        message.metadata.error.kind !== "aborted" &&
        message.metadata.error.kind !== "invalid-tool-input" &&
        message.metadata.error.kind !== "no-such-tool",
    );
  }, [filterMode, messages, isAnyAgentRunning]);

  const shouldShowContinueButton = useMemo(() => {
    if (
      filterMode !== "chat" ||
      messages.length === 0 ||
      isAnyAgentRunning ||
      !onContinue
    ) {
      return false;
    }

    const lastMessage = messages.at(-1);
    return (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.metadata.finishReason === "max-steps"
    );
  }, [filterMode, messages, isAnyAgentRunning, onContinue]);

  return (
    <>
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <ChatErrorAlert
          message={`Failed to load messages: ${error.message || "Unknown error occurred"}`}
          onStartNewChat={handleNewSession}
        />
      )}

      {!isActive &&
        !error &&
        !isLoading &&
        filterMode === "chat" &&
        messages.length === 0 && (
          <ChatZeroState project={app} selectedSessionId={sessionId} />
        )}

      <div className="w-full flex flex-col gap-2">
        {filterMode === "chat" && contextMessages.length > 0 && (
          <ContextMessages messages={contextMessages} />
        )}
        <div className="flex flex-col gap-2">
          {filterMode === "chat" ? (
            chatElements
          ) : (
            <VersionList
              projectSubdomain={app.subdomain}
              selectedVersion={selectedVersion}
            />
          )}
        </div>

        {filterMode === "chat" && isActive && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {shouldShowErrorRecoveryPrompt && (
          <ChatErrorAlert onStartNewChat={handleNewSession} />
        )}

        {shouldShowContinueButton && (
          <Alert className="mt-4" variant="warning">
            <AlertTriangle />
            <AlertDescription className="flex flex-col gap-3">
              <div className="text-xs">
                Agent was stopped due to reaching maximum unattended steps.
              </div>
              <Button onClick={onContinue} size="sm" variant="secondary">
                Resume the agent
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {filterMode === "chat" && !isAnyAgentAlive && messages.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-[10px] flex items-center justify-between text-xs text-muted-foreground/60">
              <span>Total chat usage</span>
              <span>
                {messages.length}{" "}
                {messages.length === 1 ? "message" : "messages"}
              </span>
            </div>
            <UsageSummary messages={messages} />
          </div>
        )}
      </div>
    </>
  );
}
