import type {
  ProjectSubdomain,
  SessionMessagePart,
} from "@quests/workspace/client";

import { useSetAtom } from "jotai";
import {
  ChevronDown,
  Copy,
  Loader2Icon,
  MessageSquare,
  Terminal,
} from "lucide-react";
import { useState } from "react";

import { appendToPromptAtom } from "../../atoms/prompt-value";
import { cn } from "../../lib/utils";
import { ConfirmedIconButton } from "../confirmed-icon-button";
import { ToolCard, ToolCardHeader } from "./tool-card";
import { VirtualizedScrollingText } from "./virtualized-scrolling-text";

type ShellCommandPart = Extract<
  SessionMessagePart.ToolPart,
  { type: "tool-bash" }
>;

export function ShellCommandCard({
  isLoading,
  part,
  projectSubdomain,
}: {
  isLoading: boolean;
  part: ShellCommandPart;
  projectSubdomain: ProjectSubdomain;
}) {
  const appendToPrompt = useSetAtom(appendToPromptAtom);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!part.input) {
    return null;
  }

  const command = part.input.command || "";
  const parts: string[] = [`$ ${command}`];

  const hasOutput = part.state === "output-available";
  const isError = part.state === "output-error";

  if (hasOutput) {
    const displayOutput = [part.output.stdout, part.output.stderr]
      .filter(Boolean)
      .join("\n");
    if (displayOutput) {
      parts.push(displayOutput);
    }
  } else if (isError) {
    parts.push(`Error: ${part.errorText || "Command failed"}`);
  }

  const content = parts.join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
  };

  const handleSendToChat = () => {
    appendToPrompt({
      key: projectSubdomain,
      update: (prev) => (prev ? `${prev}\n\n${content}` : content),
    });
  };

  const hasError = isError || (hasOutput && part.output.exitCode !== 0);
  const reasoning = part.input.explanation;
  const hasContent = hasOutput || isError;
  const showContent = isExpanded || isLoading;

  return (
    <ToolCard>
      <ToolCardHeader
        className={cn(
          hasContent && "cursor-pointer select-none",
          !showContent && "border-b-0",
        )}
        onClick={
          hasContent
            ? () => {
                setIsExpanded((v) => !v);
              }
            : undefined
        }
      >
        <span className="relative size-3 shrink-0">
          {isLoading ? (
            <Loader2Icon className="size-3 animate-spin text-accent-foreground/80" />
          ) : (
            <>
              <Terminal className="size-3 text-muted-foreground transition-opacity group-hover:opacity-0" />
              <ChevronDown
                className={cn(
                  "absolute inset-0 size-3 text-muted-foreground opacity-0 transition-[opacity,transform] group-hover:opacity-100",
                  isExpanded && "rotate-180",
                )}
              />
            </>
          )}
        </span>
        {hasError && (
          <span className="shrink-0 text-muted-foreground">Error</span>
        )}
        <span className="min-w-0 truncate text-foreground/80">
          {reasoning ?? command}
        </span>
      </ToolCardHeader>

      {showContent && (
        <VirtualizedScrollingText
          autoScrollToBottom={isLoading}
          content={content}
        />
      )}

      {!isLoading && projectSubdomain && isExpanded && (
        <div className="absolute top-8 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <ConfirmedIconButton
            className="size-5 border border-border/50 bg-muted hover:bg-accent!"
            icon={MessageSquare}
            onClick={handleSendToChat}
            successTooltip="Sent to chat!"
            tooltip="Send to chat"
            variant="ghost"
          />
          <ConfirmedIconButton
            className="size-5 border border-border/50 bg-muted hover:bg-accent!"
            icon={Copy}
            onClick={handleCopy}
            successTooltip="Copied!"
            tooltip="Copy"
            variant="ghost"
          />
        </div>
      )}
    </ToolCard>
  );
}
