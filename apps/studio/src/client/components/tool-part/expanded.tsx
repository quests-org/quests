import { type SessionMessagePart } from "@quests/workspace/client";

import { ToolContent } from "./content";
import { SectionHeader } from "./section-header";

export function ToolPartExpanded({
  part,
}: {
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }>;
}) {
  const explanationObject =
    typeof part.input === "object"
      ? (part.input as { explanation?: string })
      : undefined;
  const explanation = explanationObject?.explanation;

  return (
    <div>
      {explanation && (
        <div className="mb-3 pb-2 border-b border-muted-foreground/20">
          <SectionHeader>Explanation:</SectionHeader>
          <div className="text-sm italic text-muted-foreground">
            {explanation}
          </div>
        </div>
      )}
      <ToolContent part={part} />
    </div>
  );
}
