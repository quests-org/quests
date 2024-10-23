import { rpcClient } from "@/client/rpc/client";
import { isDefinedError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { cn } from "../lib/utils";

export const Markdown = memo(({ markdown }: { markdown: string }) => {
  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions({
      onError: (error) => {
        if (isDefinedError(error)) {
          toast.error(error.message);
        } else {
          toast.error("An unknown error occurred");
        }
      },
    }),
  );

  const handleLinkClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const href = event.currentTarget.href;
      if (href) {
        await openExternalLinkMutation.mutateAsync({ url: href });
      }
    },
    [openExternalLinkMutation],
  );

  return (
    <ReactMarkdown
      components={{
        a: ({ children, className, href, ...props }) => (
          <a
            {...props}
            // ! is needed because we turn off the default cursor style by
            // default due to being a desktop app
            className={cn("cursor-pointer!", className)}
            href={href}
            onClick={handleLinkClick}
          >
            {children}
          </a>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {markdown}
    </ReactMarkdown>
  );
});

Markdown.displayName = "Markdown";
