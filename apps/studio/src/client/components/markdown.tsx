import { memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "../lib/utils";
import { CopyButton } from "./copy-button";
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
        code: ({ children, className, node, ...props }) => {
          const isCodeBlock = /language-\w+/.test(className || "");
          const isMultiline = node?.position;
          const codeContent = Array.isArray(children)
            ? children.join("")
            : typeof children === "string"
              ? children.replace(/\n$/, "")
              : "";

          if (isCodeBlock && isMultiline) {
            return (
              <div className="relative group">
                <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton
                    className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-border/50"
                    iconSize={14}
                    onCopy={async () => {
                      await navigator.clipboard.writeText(codeContent);
                    }}
                  />
                </div>
                <code {...props} className={className}>
                  {children}
                </code>
              </div>
            );
          }

          return (
            <code {...props} className={className}>
              {children}
            </code>
          );
        },
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
