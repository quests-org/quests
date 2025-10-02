import { memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "../lib/utils";
import { ExternalLink } from "./external-link";

interface MarkdownProps {
  markdown: string;
  rehypePlugins?: React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"];
}

export const Markdown = memo(({ markdown, rehypePlugins }: MarkdownProps) => {
  const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());

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
          <ExternalLink {...props} className={className} href={href}>
            {children}
          </ExternalLink>
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
