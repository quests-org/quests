import { rpcClient } from "@/client/rpc/client";
import { isDefinedError } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { cn } from "../lib/utils";

interface MarkdownProps {
  markdown: string;
  rehypePlugins?: React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"];
}

export const Markdown = memo(({ markdown, rehypePlugins }: MarkdownProps) => {
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());

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

  const handleImageClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      const src = event.currentTarget.src;
      setExpandedImages((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(src)) {
          newSet.delete(src);
        } else {
          newSet.add(src);
        }
        return newSet;
      });
    },
    [],
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
        img: ({ alt, className, src, ...props }) => {
          const isExpanded = src && expandedImages.has(src);
          return (
            <img
              {...props}
              alt={alt}
              className={cn(
                "cursor-pointer! rounded-md transition-all duration-200",
                isExpanded ? "w-full" : "max-w-full",
                className,
              )}
              onClick={handleImageClick}
              src={src}
            />
          );
        },
      }}
      rehypePlugins={rehypePlugins}
      remarkPlugins={[remarkGfm]}
    >
      {markdown}
    </ReactMarkdown>
  );
});

Markdown.displayName = "Markdown";
