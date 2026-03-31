import { cn } from "@/client/lib/utils";
import { type Ref } from "react";

import { Markdown } from "./markdown";

export const SessionMarkdown = ({
  assetBaseUrl,
  className,
  markdown,
  ref,
}: {
  assetBaseUrl?: string;
  className?: string;
  markdown: string;
  ref?: Ref<HTMLDivElement>;
}) => {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-sm/relaxed wrap-break-word prose-custom dark:prose-invert",
        className,
      )}
      ref={ref}
    >
      <Markdown assetBaseUrl={assetBaseUrl} markdown={markdown} />
    </div>
  );
};

SessionMarkdown.displayName = "MarkdownProse";
