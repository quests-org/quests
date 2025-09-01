import {
  type SessionMessage,
  SessionMessagePart,
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAppState } from "../hooks/use-app-state";
import { rpcClient } from "../rpc/client";
import { AssistantMessage } from "./assistant-message";
import { ChatErrorAlert } from "./chat-error-alert";
import { DebugWrapper } from "./debug-wrapper";
import { GitCommitCard } from "./git-commit-card";
import { MessageError } from "./message-error";
import { ReasoningMessage } from "./reasoning-message";
import { ToolPart } from "./tool-part";
import { UnknownPart } from "./unknown-part";
import { UsageSummary } from "./usage-summary";
import { UserMessage } from "./user-message";

export type FilterMode = "chat" | "versions";

interface SessionEventListProps {
  app: WorkspaceAppProject;
  filterMode: FilterMode;
  selectedVersion?: string;
  sessionId: StoreId.Session;
}

export function SessionStream({
  app,
  filterMode,
  selectedVersion,
  sessionId,
}: SessionEventListProps) {
  const { data: messages = [] } = useQuery(
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
          }).then(() => {
            toast.success("New chat created");
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

        if (message.role === "user") {
          return <UserMessage key={part.metadata.id} part={part} />;
        } else if (message.role === "assistant") {
          return <AssistantMessage key={part.metadata.id} part={part} />;
        } else {
          return null;
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

  const chatElements = useMemo(() => {
    const result: React.ReactNode[] = [];
    let lastSummaryEndIndex = 0;

    for (const [messageIndex, message] of messages.entries()) {
      if (message.role === "user" && messageIndex > 0) {
        const messagesForSummary = messages.slice(
          lastSummaryEndIndex,
          messageIndex,
        );
        if (messagesForSummary.length > 0) {
          result.push(
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
        const isLastMessage = messageIndex === messages.length - 1;
        messageElements.push(
          <DebugWrapper
            data={message.metadata.error}
            key={`error-${message.id}`}
            label="error"
          >
            <MessageError
              defaultExpanded={isLastMessage && !isAnyAgentRunning}
              error={message.metadata.error}
              key={`error-${message.id}`}
            />
          </DebugWrapper>,
        );
      }

      result.push(...messageElements);
    }

    return result;
  }, [messages, renderChatPart, isAnyAgentRunning]);

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

  // Render versions mode elements
  const versionElements = useMemo(() => {
    return gitCommitParts.map((part) => {
      const isLast = part.data.ref === gitCommitParts.at(-1)?.data.ref;
      return (
        <GitCommitCard
          isLastGitCommit={isLast}
          isSelected={
            selectedVersion === part.data.ref || (isLast && !selectedVersion)
          }
          key={part.data.ref}
          projectSubdomain={app.subdomain}
          restoredFromRef={part.data.restoredFromRef}
          showCommitMessage
          versionRef={part.data.ref}
        />
      );
    });
  }, [gitCommitParts, selectedVersion, app.subdomain]);

  return (
    <>
      {messages.length === 0 && !isActive && (
        <div className="text-center text-muted-foreground text-xs">
          {filterMode === "versions" ? "No versions yet" : "No messages yet"}
        </div>
      )}

      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          {filterMode === "chat" ? chatElements : versionElements}
        </div>

        {filterMode === "chat" && isActive && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {shouldShowErrorRecoveryPrompt && (
          <ChatErrorAlert onStartNewChat={handleNewSession} />
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
