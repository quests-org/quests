import { type SessionMessagePart } from "@quests/workspace/client";
import { ChevronUp, HelpCircle } from "lucide-react";
import { useState } from "react";

import { CollapsiblePartTrigger } from "./collapsible-part-trigger";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface UnknownPartProps {
  part: SessionMessagePart.Type;
}

export function UnknownPart({ part }: UnknownPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const mainContent = (
    <div className="flex w-full min-w-0 items-center gap-2 text-xs leading-tight">
      <span className="shrink-0 text-accent-foreground/80">
        <HelpCircle className="size-3" />
      </span>

      <span className="shrink-0 font-medium text-foreground/60">
        Unknown part
      </span>

      <span className="min-w-0 truncate text-muted-foreground/60">
        {part.type}
      </span>

      {isExpanded && (
        <span className="ml-auto shrink-0 text-accent-foreground/60">
          <ChevronUp className="size-3" />
        </span>
      )}
    </div>
  );

  return (
    <Collapsible
      className="w-full"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <CollapsibleTrigger asChild>
        <CollapsiblePartTrigger>{mainContent}</CollapsiblePartTrigger>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 text-xs">
          <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-2">
            <div className="mb-1 font-semibold">Unknown Part Data:</div>
            <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
              {JSON.stringify(part, null, 2)}
            </pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
