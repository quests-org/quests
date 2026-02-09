import { type SessionMessagePart } from "@quests/workspace/client";

import { ToolContent } from "./content";
import { SectionHeader } from "./section-header";

export function ToolPartExpanded({
  onRetry,
  part,
}: {
  onRetry: (prompt: string) => void;
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }>;
}) {
  const isWebSearch = part.type === "tool-web_search";
  const explanationObject =
    typeof part.input === "object"
      ? (part.input as { explanation?: string })
      : undefined;
  const explanation = isWebSearch ? undefined : explanationObject?.explanation;

  return (
    <div>
      {explanation && (
        <div className="mb-3 border-b border-muted-foreground/20 pb-2">
          <SectionHeader>Explanation:</SectionHeader>
          <div className="text-sm text-muted-foreground italic">
            {explanation}
          </div>
        </div>
      )}
      <ToolContent onRetry={onRetry} part={part} />
    </div>
  );
}
