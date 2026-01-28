import type {
  ProjectSubdomain,
  SessionMessagePart,
} from "@quests/workspace/client";

import { getDefaultStore } from "jotai";
import { Copy, Loader2Icon, MessageSquare, Terminal } from "lucide-react";

import { promptValueAtomFamily } from "../../atoms/prompt-value";
import { ConfirmedIconButton } from "../confirmed-icon-button";
import { ToolCard, ToolCardHeader } from "./tool-card";
import { VirtualizedScrollingText } from "./virtualized-scrolling-text";

type ShellCommandPart = Extract<
  SessionMessagePart.ToolPart,
  { type: "tool-run_shell_command" }
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
  if (!part.input) {
    return null;
  }

  const command = part.input.command || "";
  const parts: string[] = [`$ ${command}`];

  const hasOutput = part.state === "output-available";
  const isError = part.state === "output-error";

  // Format output - support both new combined field and legacy stdout/stderr
  if (hasOutput) {
    const displayOutput =
      part.output.combined ??
      (part.output.stderr && part.output.stdout
        ? `${part.output.stdout}${part.output.stderr}`
        : (part.output.stderr ?? part.output.stdout));
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

  const handleSendToChat = async () => {
    const defaultStore = getDefaultStore();
    const atom = promptValueAtomFamily(projectSubdomain);
    const prevPromptValue = await Promise.resolve(defaultStore.get(atom));
    defaultStore.set(
      atom,
      prevPromptValue ? `${prevPromptValue}\n\n${content}` : content,
    );
  };

  const hasError = isError || (hasOutput && part.output.exitCode !== 0);

  const statusText = isLoading
    ? "Running..."
    : hasError
      ? "Error"
      : hasOutput
        ? "Success"
        : "Pending";

  const reasoning = part.input.explanation;

  return (
    <ToolCard>
      <ToolCardHeader>
        {isLoading ? (
          <Loader2Icon className="size-3 shrink-0 animate-spin text-accent-foreground/80" />
        ) : (
          <Terminal className="size-3 shrink-0 text-muted-foreground" />
        )}
        <span className="shrink-0 text-muted-foreground">{statusText}</span>
        {reasoning && (
          <span className="ml-auto min-w-0 truncate text-muted-foreground/60">
            {reasoning}
          </span>
        )}
      </ToolCardHeader>

      <VirtualizedScrollingText
        autoScrollToBottom={isLoading}
        content={content}
      />

      {!isLoading && projectSubdomain && (
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
