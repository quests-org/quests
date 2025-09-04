import { type SessionMessage } from "@quests/workspace/client";
import { ChevronDown, Copy } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { toast } from "sonner";

import { DebugWrapper } from "./debug-wrapper";
import { ContextMessage } from "./session-context-message";
import { Button } from "./ui/button";

export const ContextMessages = memo(function ContextMessages({
  messages,
}: {
  messages: SessionMessage.ContextWithParts[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const contextElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    for (const message of messages) {
      for (const [_, part] of message.parts.entries()) {
        if (part.type === "text") {
          if (part.state === "done" && part.text.trim() === "") {
            continue;
          }

          const rendered = (
            <ContextMessage
              key={part.metadata.id}
              message={message}
              part={part}
            />
          );

          elements.push(
            <DebugWrapper data={part} key={part.metadata.id} label={part.type}>
              {rendered}
            </DebugWrapper>,
          );
        }
      }
    }
    return elements;
  }, [messages]);

  const handleCopy = async () => {
    if (isCopying) {
      return;
    }

    setIsCopying(true);
    try {
      const allText = messages
        .flatMap((message) => message.parts)
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n\n");

      await navigator.clipboard.writeText(allText);
      toast.success("System prompt copied to clipboard");
    } catch {
      toast.error("Failed to copy system prompt");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="w-full mb-2">
      <div className="flex justify-center">
        <Button
          className="h-5 px-2 text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/20 rounded-sm"
          onClick={() => {
            setIsExpanded(!isExpanded);
          }}
          variant="ghost"
        >
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-normal">View system prompt</span>
            {isExpanded && <ChevronDown className="size-2" />}
          </div>
        </Button>
      </div>

      {isExpanded && (
        <div className="group mt-2">
          <div className="border-l-4 border-muted-foreground/30 pl-4 bg-muted/30 py-2 rounded-r-md">
            <div className="mb-3 pb-2 pr-4 border-b border-muted-foreground/20">
              <p className="text-xs italic text-muted-foreground">
                Instructions given to the agent explaining how to work in
                Quests.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="flex flex-col gap-2">{contextElements}</div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              aria-label="Copy system prompt"
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
              disabled={isCopying}
              onClick={handleCopy}
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
