import { openFilePreviewAtom } from "@/client/atoms/file-preview";
import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
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
  <div className="group relative">
    <div className="absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
      <CopyButton
        className="rounded-md border border-border/50 bg-background/80 p-1 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
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
  const openFilePreview = useSetAtom(openFilePreviewAtom);

  const handleImageClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      const src = event.currentTarget.src;
      const alt = event.currentTarget.alt || "image";
      if (src) {
        openFilePreview({
          name: alt,
          url: src,
        });
      }
    },
    [openFilePreview],
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
          return (
            <img
              {...props}
              alt={alt}
              className={cn("max-w-full cursor-pointer! rounded-md", className)}
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
