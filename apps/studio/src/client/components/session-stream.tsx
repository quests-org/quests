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
import { AssistantMessagesFooter } from "./assistant-messages-footer";
import { ChatErrorAlert } from "./chat-error-alert";
import { ChatZeroState } from "./chat-zero-state";
import { ContextMessages } from "./context-messages";
import { FileAttachmentsCard } from "./file-attachments-card";
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
}

export function SessionStream({
  onContinue,
  project,
  selectedVersion,
  sessionId,
}: SessionEventListProps) {
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
            assetBaseUrl={project.urls.assetBase}
            isLastGitCommit={isLastVersion}
            isSelected={
              selectedVersion === part.data.ref ||
              (isLastVersion && !selectedVersion)
            }
            key={part.metadata.id}
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
              isAgentRunning &&
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
              isAgentRunning &&
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
      isAgentRunning,
      lastMessageId,
    ],
  );

  const { chatElements } = useMemo(() => {
    const newChatElements: React.ReactNode[] = [];
    let lastFooterIndex = 0;

    for (const [messageIndex, message] of regularMessages.entries()) {
      const messageElements: React.ReactNode[] = [];
      const seenSourceIds = new Set<string>();
      const sources: (
        | SessionMessagePart.SourceDocumentPart
        | SessionMessagePart.SourceUrlPart
      )[] = [];

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

        if (message.role === "user" && part.type === "data-fileAttachments") {
          fileAttachments.push(part);
          continue;
        }

        const rendered = renderChatPart(part, message, partIndex);
        if (rendered) {
          messageElements.push(rendered);
        }
      }

      const nextMessage = regularMessages[messageIndex + 1];
      const isLastInConsecutiveGroup =
        message.role === "assistant" &&
        (!nextMessage || nextMessage.role !== "assistant");

      if (isLastInConsecutiveGroup) {
        const assistantMessagesForFooter = regularMessages.slice(
          lastFooterIndex,
          messageIndex + 1,
        );
        const assistantMessages = assistantMessagesForFooter.filter(
          (m) => m.role === "assistant",
        );

        const isLastMessageGroup = messageIndex === regularMessages.length - 1;
        const shouldRenderFooter =
          assistantMessages.length > 0 &&
          (!isLastMessageGroup || !isAgentRunning);

        if (shouldRenderFooter) {
          messageElements.push(
            <AssistantMessagesFooter
              key={`actions-${message.id}`}
              messages={assistantMessages}
            />,
          );
        }

        lastFooterIndex = messageIndex + 1;
      }

      if (message.role === "user" && fileAttachments.length > 0) {
        const fileAttachmentsPart = fileAttachments.find(
          (part) => part.type === "data-fileAttachments",
        );

        if (fileAttachmentsPart) {
          const files = fileAttachmentsPart.data.files;

          messageElements.unshift(
            <FileAttachmentsCard
              files={files}
              key={`attachments-${message.id}`}
              projectSubdomain={project.subdomain}
            />,
          );
        }
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
            defaultExpanded={isLastMessage && !isAgentRunning}
            key={`error-${message.id}`}
            message={message}
            onContinue={onContinue}
            showUpgradeAlertIfApplicable={isLastMessage && !isAgentRunning}
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
    isAgentRunning,
    onContinue,
    project.subdomain,
  ]);

  const shouldShowErrorRecoveryPrompt = useMemo(() => {
    if (messages.length === 0 || isAgentRunning) {
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
  }, [messages, isAgentRunning]);

  const shouldShowContinueButton = useMemo(() => {
    if (messages.length === 0 || isAgentRunning) {
      return false;
    }

    const lastMessage = messages.at(-1);
    return (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.metadata.finishReason === "max-steps"
    );
  }, [messages, isAgentRunning]);

  return (
    <>
      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {messageError && (
        <ChatErrorAlert
          message={`Failed to load messages: ${messageError.message || "Unknown error occurred"}`}
          onStartNewChat={handleNewSession}
        />
      )}

      {!isAgentRunning &&
        !messageError &&
        !isLoading &&
        messages.length === 0 && (
          <ChatZeroState project={project} selectedSessionId={sessionId} />
        )}

      <div className="flex w-full flex-col gap-2">
        {contextMessages.length > 0 && (
          <ContextMessages messages={contextMessages} />
        )}
        <div className="flex flex-col gap-2">{chatElements}</div>

        {isAgentRunning && (
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

        {!isAgentAlive && messages.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <UsageSummary messages={messages} />
          </div>
        )}
      </div>
    </>
  );
}
