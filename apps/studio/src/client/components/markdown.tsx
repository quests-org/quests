import { memo, useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remend from "remend";

import { cn } from "../lib/utils";
import { CopyButton } from "./copy-button";
import { ExternalLink } from "./external-link";

interface MarkdownProps {
  markdown: string;
  rehypePlugins?: React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"];
}

const CodeWithCopy = ({
  children,
  content,
}: {
  children: React.ReactNode;
  content: string;
}) => (
  <div className="relative group">
    <div className="absolute right-1 top-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
      <CopyButton
        className="p-1 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-border/50"
        iconSize={12}
        onCopy={async () => {
          await navigator.clipboard.writeText(content);
        }}
      />
    </div>
    {children}
  </div>
);

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
        code: ({ children, className, node: _node, ...props }) => {
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
        pre: ({ children, node: _node, ...props }) => {
          const textContent =
            typeof children === "string"
              ? children
              : children &&
                  typeof children === "object" &&
                  "props" in children &&
                  children.props &&
                  typeof children.props === "object" &&
                  "children" in children.props
                ? String(children.props.children)
                : "";

          return (
            <CodeWithCopy content={textContent}>
              <pre {...props}>{children}</pre>
            </CodeWithCopy>
          );
        },
      }}
      rehypePlugins={rehypePlugins}
      remarkPlugins={[remarkGfm]}
    >
      {remend(markdown)}
    </ReactMarkdown>
  );
});

Markdown.displayName = "Markdown";
