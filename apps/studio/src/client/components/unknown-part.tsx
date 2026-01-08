import { type SessionMessagePart } from "@quests/workspace/client";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

import {
  CollapsiblePartHeader,
  CollapsiblePartMainContent,
  CollapsiblePartTrigger,
} from "./collapsible-part";
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
    <CollapsiblePartHeader
      icon={<HelpCircle className="size-3" />}
      isExpanded={isExpanded}
      label="Unknown part"
      labelClassName="text-foreground/60"
      value={<span className="text-muted-foreground/60">{part.type}</span>}
    />
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
        <CollapsiblePartMainContent>
          <div className="mb-1 font-semibold">Unknown Part Data:</div>
          <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
            {JSON.stringify(part, null, 2)}
          </pre>
        </CollapsiblePartMainContent>
      </CollapsibleContent>
    </Collapsible>
  );
}
