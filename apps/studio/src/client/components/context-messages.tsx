import { type SessionMessage } from "@quests/workspace/client";
import { ChevronDown } from "lucide-react";
import { memo, useMemo, useState } from "react";

import { CopyButton } from "./copy-button";
import { ContextMessage } from "./session-context-message";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

export const ContextMessages = memo(function ContextMessages({
  messages,
}: {
  messages: SessionMessage.ContextWithParts[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const contextElements = useMemo(() => {
    const elements: React.ReactNode[] = [];
    for (const message of messages) {
      for (const [_, part] of message.parts.entries()) {
        if (part.type === "text") {
          if (part.state === "done" && part.text.trim() === "") {
            continue;
          }

          elements.push(
            <ContextMessage
              key={part.metadata.id}
              message={message}
              part={part}
            />,
          );
        }
      }
    }
    return elements;
  }, [messages]);

  const handleCopy = async () => {
    const allText = messages
      .flatMap((message) => message.parts)
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n");

    await navigator.clipboard.writeText(allText);
  };

  return (
    <Collapsible
      className="mb-2 w-full"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <div className="flex justify-center">
        <CollapsibleTrigger asChild>
          <Button
            className="h-5 rounded-sm px-2 text-xs text-muted-foreground/50 hover:bg-accent/20 hover:text-muted-foreground"
            variant="ghost"
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-normal">
                View system prompt
              </span>
              {isExpanded && <ChevronDown className="size-2" />}
            </div>
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <div className="group mt-2">
          <div className="rounded-r-md border-l-4 border-muted-foreground/30 bg-muted/30 py-2 pl-4">
            <div className="mb-3 border-b border-muted-foreground/20 pr-4 pb-2">
              <p className="text-xs text-muted-foreground italic">
                Instructions given to the agent explaining how to work in
                Quests.
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="flex flex-col gap-2">{contextElements}</div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <CopyButton
              className="rounded p-1 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
              iconSize={12}
              onCopy={handleCopy}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
