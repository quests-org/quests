import { cn } from "@/client/lib/utils";
import { forwardRef } from "react";

import { Markdown } from "./markdown";

export const SessionMarkdown = forwardRef<
  HTMLDivElement,
  {
    className?: string;
    markdown: string;
  }
>(({ className, markdown }, ref) => {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-sm leading-relaxed wrap-break-word prose-custom dark:prose-invert",
        className,
      )}
      ref={ref}
    >
      <Markdown markdown={markdown} />
    </div>
  );
});

SessionMarkdown.displayName = "MarkdownProse";
