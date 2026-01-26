import { cn } from "@/client/lib/utils";
import { type Ref } from "react";

import { Markdown } from "./markdown";

export const SessionMarkdown = ({
  className,
  markdown,
  ref,
}: {
  className?: string;
  markdown: string;
  ref?: Ref<HTMLDivElement>;
}) => {
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
};

SessionMarkdown.displayName = "MarkdownProse";
