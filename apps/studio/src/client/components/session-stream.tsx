import {
  isInsufficientCreditsError,
  isToolPart,
  type SessionMessage,
  type SessionMessagePart,
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { selectFirst } from "radashi";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useAppState } from "../hooks/use-app-state";
import { rpcClient } from "../rpc/client";
import { AssistantMessage } from "./assistant-message";
import { ChatErrorAlert } from "./chat-error-alert";
import { ChatZeroState } from "./chat-zero-state";
import { ContextMessages } from "./context-messages";
import { FileAttachmentCard } from "./file-attachment-card";
import { MessageActionsRow } from "./message-actions-row";
import { MessageError } from "./message-error";
import { ReasoningMessage } from "./reasoning-message";
import { ContextMessage } from "./session-context-message";
import { ToolPart } from "./tool-part";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { UnknownPart } from "./unknown-part";
import { UsageSummary } from "./usage-summary";
import { UserMessage } from "./user-message";
import { VersionAndFilesCard } from "./version-and-files-card";
export type FilterMode = "chat" | "versions";

interface SessionEventListProps {
  onContinue: () => void;
  project: WorkspaceAppProject;
  selectedVersion?: string;
  sessionId: StoreId.Session;
  showMessageActions?: boolean;
}

export function SessionStream({
  onContinue,
  project,
  selectedVersion,
  sessionId,
  showMessageActions = true,
}: SessionEventListProps) {
  const {
    data: messages = [],
    error,
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
  const navigate = useNavigate();

  const createEmptySessionMutation = useMutation(
    rpcClient.workspace.session.create.mutationOptions(),
  );

  const handleNewSession = () => {
    createEmptySessionMutation.mutate(
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
          });
        },
      },
    );
  };

  const isAnyAgentRunning = (appState?.sessionActors ?? []).some(
    (s) => s.sessionId === sessionId && s.tags.includes("agent.running"),
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

  const lastMessageId = useMemo((): StoreId.Message | undefined => {
    if (regularMessages.length === 0) {
      return;
    }
    const lastMessage = regularMessages.at(-1);
    return lastMessage?.id;
  }, [regularMessages]);

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
          <VersionAndFilesCard
            assetBaseURL={project.urls.assetBase}
            isLastGitCommit={isLastVersion}
            isSelected={
              selectedVersion === part.data.ref ||
              (isLastVersion && !selectedVersion)
            }
            key={part.metadata.id}
            messageId={message.id}
            projectSubdomain={project.subdomain}
            restoredFromRef={part.data.restoredFromRef}
            versionRef={part.data.ref}
          />
        );
      }

      if (part.type === "data-fileAttachments") {
        return null;
      }

      if (isToolPart(part)) {
        return (
          <ToolPart
            isLoading={
              isAnyAgentRunning &&
              lastMessageId === part.metadata.messageId &&
              (part.state === "input-streaming" ||
                part.state === "input-available")
            }
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
            isLoading={
              isAnyAgentRunning &&
              lastMessageId === part.metadata.messageId &&
              part.state === "streaming"
            }
            key={part.metadata.id}
            text={part.text}
          />
        );
      }

      if (part.type === "source-document" || part.type === "source-url") {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (part.type === "file") {
        // eslint-disable-next-line no-console
        console.warn("File part not supported yet", part);
        return null;
      }

      // File attachments were one part per file. Safe to ignore these.
      // Remove after 2026-01-17
      if ((part as { type: string }).type === "data-fileAttachment") {
        return null;
      }

      const _exhaustiveCheck: never = part;
      return <UnknownPart key={partIndex} part={_exhaustiveCheck} />;
    },
    [
      project.urls.assetBase,
      project.subdomain,
      gitCommitParts,
      selectedVersion,
      isAnyAgentRunning,
      lastMessageId,
    ],
  );

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
            <UsageSummary
              key={`usage-before-${message.id}`}
              messages={messagesForSummary}
            />,
          );
          lastSummaryEndIndex = messageIndex;
        }
      }

      const messageElements: React.ReactNode[] = [];
      const seenSourceIds = new Set<string>();
      const sources: (
        | SessionMessagePart.SourceDocumentPart
        | SessionMessagePart.SourceUrlPart
      )[] = [];
      let assistantTextContent = "";
      let isAssistantMessageDone = false;

      const fileAttachments: SessionMessagePart.Type[] = [];

      for (const [partIndex, part] of message.parts.entries()) {
        if (
          (part.type === "source-document" || part.type === "source-url") &&
          seenSourceIds.has(part.sourceId)
        ) {
          continue;
        }
        if (part.type === "source-document" || part.type === "source-url") {
          seenSourceIds.add(part.sourceId);
          sources.push(part);
          continue;
        }
        if (part.type === "text" && message.role === "assistant") {
          assistantTextContent += part.text;
          isAssistantMessageDone = part.state === "done";
        }

        if (message.role === "user" && part.type === "data-fileAttachments") {
          fileAttachments.push(part);
          continue;
        }

        const rendered = renderChatPart(part, message, partIndex);
        if (rendered) {
          messageElements.push(rendered);
        }
      }

      if (message.role === "user" && fileAttachments.length > 0) {
        const fileAttachmentsPart = fileAttachments.find(
          (part) => part.type === "data-fileAttachments",
        );

        if (fileAttachmentsPart) {
          const files = fileAttachmentsPart.data.files;

          messageElements.unshift(
            <div
              className="flex flex-wrap items-start justify-end gap-2"
              key={`attachments-${message.id}`}
            >
              {files.map((file, index) => (
                <FileAttachmentCard
                  file={file}
                  files={files}
                  key={`${fileAttachmentsPart.metadata.id}-${index}`}
                  messageId={message.id}
                  projectSubdomain={project.subdomain}
                />
              ))}
            </div>,
          );
        }
      }

      if (message.role === "assistant" && isAssistantMessageDone) {
        messageElements.push(
          <MessageActionsRow
            key={`actions-${message.id}`}
            messageText={assistantTextContent}
            showActions={showMessageActions}
            sources={sources}
          />,
        );
      }

      if (
        message.role === "assistant" &&
        message.metadata.error &&
        // Aborted errors mostly happen when user stops the agent, so we don't
        // want to show the error
        message.metadata.error.kind !== "aborted"
      ) {
        const isLastMessage = messageIndex === regularMessages.length - 1;
        messageElements.push(
          <MessageError
            defaultExpanded={isLastMessage && !isAnyAgentRunning}
            key={`error-${message.id}`}
            message={message}
            onContinue={onContinue}
            showUpgradeAlertIfApplicable={isLastMessage && !isAnyAgentRunning}
          />,
        );
      }

      newChatElements.push(...messageElements);
    }

    return {
      chatElements: newChatElements,
    };
  }, [
    regularMessages,
    renderChatPart,
    isAnyAgentRunning,
    showMessageActions,
    onContinue,
    project.subdomain,
  ]);

  const shouldShowErrorRecoveryPrompt = useMemo(() => {
    if (messages.length === 0 || isAnyAgentRunning) {
      return false;
    }

    const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
    const messagesSinceLastUser = messages.slice(lastUserIndex + 1);

    const lastError = selectFirst(messagesSinceLastUser.toReversed(), (m) =>
      m.role === "assistant" && m.metadata.error ? m : undefined,
    );
    if (!lastError || isInsufficientCreditsError(lastError)) {
      return false;
    }

    return messagesSinceLastUser.some(
      (m) =>
        m.role === "assistant" &&
        m.metadata.error &&
        m.metadata.error.kind !== "aborted" &&
        m.metadata.error.kind !== "invalid-tool-input" &&
        m.metadata.error.kind !== "no-such-tool",
    );
  }, [messages, isAnyAgentRunning]);

  const shouldShowContinueButton = useMemo(() => {
    if (messages.length === 0 || isAnyAgentRunning) {
      return false;
    }

    const lastMessage = messages.at(-1);
    return (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.metadata.finishReason === "max-steps"
    );
  }, [messages, isAnyAgentRunning]);

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

      {!isActive && !error && !isLoading && messages.length === 0 && (
        <ChatZeroState project={project} selectedSessionId={sessionId} />
      )}

      <div className="flex w-full flex-col gap-2">
        {contextMessages.length > 0 && (
          <ContextMessages messages={contextMessages} />
        )}
        <div className="flex flex-col gap-2">{chatElements}</div>

        {isActive && (
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

        {!isAnyAgentAlive && messages.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="flex items-center justify-between text-xs text-[10px] text-muted-foreground/60">
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
