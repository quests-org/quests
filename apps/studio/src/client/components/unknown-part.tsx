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
    <div className="flex items-center gap-2 min-w-0 w-full text-xs leading-tight">
      <span className="shrink-0 text-accent-foreground/80">
        <HelpCircle className="size-3" />
      </span>

      <span className="text-foreground/60 font-medium shrink-0">
        Unknown part
      </span>

      <span className="text-muted-foreground/60 truncate min-w-0">
        {part.type}
      </span>

      {isExpanded && (
        <span className="shrink-0 text-accent-foreground/60 ml-auto">
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
          <div className="p-2 bg-muted/30 rounded-md border max-h-64 overflow-y-auto">
            <div className="mb-1 font-semibold">Unknown Part Data:</div>
            <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
              {JSON.stringify(part, null, 2)}
            </pre>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
