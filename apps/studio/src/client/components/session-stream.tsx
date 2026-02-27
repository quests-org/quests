import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import {
  isToolPart,
  type SessionMessage,
  type SessionMessagePart,
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useCallback, useMemo } from "react";

import { cn } from "../lib/utils";
import { AssistantMessage } from "./assistant-message";
import { AssistantMessagesFooter } from "./assistant-messages-footer";
import { AttachmentsCard } from "./attachments-card";
import { ContextMessages } from "./context-messages";
import { MessageError } from "./message-error";
import { ReasoningMessage } from "./reasoning-message";
import { ContextMessage } from "./session-context-message";
import { ToolPart } from "./tool-part";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { UnknownPart } from "./unknown-part";
import { UserMessage } from "./user-message";
import { VersionAndFilesCard } from "./version-and-files-card";

interface SessionEventListProps {
  isAgentRunning: boolean;
  isDeveloperMode: boolean;
  isViewingApp?: boolean;
  messages: SessionMessage.WithParts[];
  onContinue: () => void;
  onModelChange: (modelURI: AIGatewayModelURI.Type) => void;
  onRetry: (prompt: string) => void;
  onStartNewChat: () => void;
  project: WorkspaceAppProject;
  selectedVersion?: string;
}

export function SessionStream({
  isAgentRunning,
  isDeveloperMode,
  isViewingApp = false,
  messages,
  onContinue,
  onModelChange,
  onRetry,
  onStartNewChat,
  project,
  selectedVersion,
}: SessionEventListProps) {
  const navigate = useNavigate();
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

  const renderStream = useCallback(
    (nestedMessages: SessionMessage.WithParts[]) => (
      <SessionStream
        // For now, the child session streams are only shown when they
        // are done. So avoid showing the loading state.
        isAgentRunning={false}
        isDeveloperMode={isDeveloperMode}
        isViewingApp={isViewingApp}
        messages={nestedMessages}
        onContinue={onContinue}
        onModelChange={onModelChange}
        onRetry={onRetry}
        onStartNewChat={onStartNewChat}
        project={project}
      />
    ),
    [
      isDeveloperMode,
      isViewingApp,
      onContinue,
      onModelChange,
      onRetry,
      onStartNewChat,
      project,
    ],
  );

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
        const isSelected =
          selectedVersion === part.data.ref ||
          (isLastVersion && !selectedVersion);
        const shouldSetVersion = !isSelected && !isLastVersion;

        return (
          <VersionAndFilesCard
            assetBaseUrl={project.urls.assetBase}
            className="mt-2"
            isLastGitCommit={isLastVersion}
            isSelected={isSelected}
            isViewingApp={isViewingApp}
            key={part.metadata.id}
            onVersionClick={() => {
              void navigate({
                from: "/projects/$subdomain",
                params: { subdomain: project.subdomain },
                replace: true,
                search: (prev) => ({
                  ...prev,
                  selectedVersion: shouldSetVersion ? part.data.ref : undefined,
                  view: "app",
                  viewFile: undefined,
                  viewFileVersion: undefined,
                }),
              });
            }}
            projectSubdomain={project.subdomain}
            restoredFromRef={part.data.restoredFromRef}
            versionRef={part.data.ref}
          />
        );
      }

      if (part.type === "data-attachments") {
        return null;
      }

      if (isToolPart(part)) {
        return (
          <ToolPart
            isDeveloperMode={isDeveloperMode}
            isLoading={
              isAgentRunning &&
              lastMessageId === message.id &&
              (part.state === "input-streaming" ||
                part.state === "input-available")
            }
            key={part.metadata.id}
            onRetry={onRetry}
            part={part}
            project={project}
            renderStream={renderStream}
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
              lastMessageId === message.id &&
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
      gitCommitParts,
      selectedVersion,
      project,
      navigate,
      isDeveloperMode,
      isAgentRunning,
      lastMessageId,
      onRetry,
      renderStream,
      isViewingApp,
    ],
  );

  const { chatElements } = useMemo(() => {
    const newChatElements: React.ReactNode[] = [];
    let lastFooterIndex = 0;
    let visibleAssistantContentCount = 0;

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

        if (message.role === "user" && part.type === "data-attachments") {
          fileAttachments.push(part);
          continue;
        }

        const rendered = renderChatPart(part, message, partIndex);
        if (rendered) {
          messageElements.push(rendered);
          if (message.role === "assistant") {
            visibleAssistantContentCount++;
          }
        }
      }

      const nextMessage = regularMessages[messageIndex + 1];
      const isLastInConsecutiveGroup =
        message.role === "assistant" &&
        (!nextMessage || nextMessage.role !== "assistant");

      if (message.role === "user" && fileAttachments.length > 0) {
        const fileAttachmentsPart = fileAttachments.find(
          (part) => part.type === "data-attachments",
        );

        if (fileAttachmentsPart) {
          const files = fileAttachmentsPart.data.files;

          messageElements.unshift(
            <AttachmentsCard
              assetBaseUrl={project.urls.assetBase}
              files={files}
              folders={fileAttachmentsPart.data.folders}
              key={`attachments-${message.id}`}
              projectSubdomain={project.subdomain}
            />,
          );
        }
      }

      if (message.role === "assistant" && message.metadata.error) {
        const isLastMessage = messageIndex === regularMessages.length - 1;
        messageElements.push(
          <MessageError
            isAgentRunning={isAgentRunning}
            isDeveloperMode={isDeveloperMode}
            isLastMessage={isLastMessage}
            key={`error-${message.id}`}
            message={message}
            onContinue={onContinue}
            onModelChange={onModelChange}
            onRetry={onRetry}
            onStartNewChat={onStartNewChat}
          />,
        );
      }

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
          visibleAssistantContentCount > 0 &&
          (!isLastMessageGroup || !isAgentRunning);

        if (shouldRenderFooter) {
          messageElements.push(
            <AssistantMessagesFooter
              key={`assistant-footer-${message.id}`}
              messages={assistantMessages}
              subdomain={project.subdomain}
            />,
          );
        }

        lastFooterIndex = messageIndex + 1;
        visibleAssistantContentCount = 0;
      }

      newChatElements.push(...messageElements);
    }

    return {
      chatElements: newChatElements,
    };
  }, [
    project.urls.assetBase,
    project.subdomain,
    regularMessages,
    renderChatPart,
    isAgentRunning,
    isDeveloperMode,
    onContinue,
    onModelChange,
    onRetry,
    onStartNewChat,
  ]);

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

  const hasActiveLoadingState = useMemo(() => {
    if (!isAgentRunning || regularMessages.length === 0) {
      return false;
    }

    const lastMessage = regularMessages.at(-1);
    if (!lastMessage || lastMessage.id !== lastMessageId) {
      return false;
    }

    const lastPart = lastMessage.parts.at(-1);
    if (!lastPart) {
      return false;
    }

    if (lastPart.type === "text" && lastPart.state !== "done") {
      return true;
    }

    if (isToolPart(lastPart)) {
      return (
        lastPart.state === "input-streaming" ||
        lastPart.state === "input-available"
      );
    }

    if (lastPart.type === "reasoning" && lastPart.state === "streaming") {
      return true;
    }

    return false;
  }, [isAgentRunning, regularMessages, lastMessageId]);

  return (
    <div
      className={cn(
        "group/assistant-message-footer",
        "flex w-full flex-col gap-2",
      )}
    >
      {contextMessages.length > 0 && (
        <ContextMessages messages={contextMessages} />
      )}
      <div className="flex flex-col gap-2">{chatElements}</div>

      {isAgentRunning && (
        <div className={hasActiveLoadingState ? "invisible" : "visible"}>
          <ReasoningMessage hideIcon isLoading text="" />
        </div>
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
    </div>
  );
}
