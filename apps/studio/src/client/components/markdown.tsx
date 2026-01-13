import { openFilePreviewAtom } from "@/client/atoms/file-preview";
import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remend from "remend";

import { useSyntaxHighlighting } from "../hooks/use-syntax-highlighting";
import { cn } from "../lib/utils";
import { CopyButton } from "./copy-button";
import { ExternalLink } from "./external-link";

import "katex/dist/katex.min.css";

interface MarkdownProps {
  allowRawHtml?: boolean;
  markdown: string;
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

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const { highlightedHtml } = useSyntaxHighlighting({ code, language });

  if (!highlightedHtml) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />;
};

export const Markdown = memo(({ allowRawHtml, markdown }: MarkdownProps) => {
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

  const rehypePlugins = allowRawHtml ? [rehypeRaw, rehypeKatex] : [rehypeKatex];

  return (
    <ReactMarkdown
      components={{
        a: ({ children, className, href, ...props }) => (
          <ExternalLink {...props} className={className} href={href}>
            {children}
          </ExternalLink>
        ),
        code: ({ children, className, node: _node, ref: _ref, ...props }) => {
          const match = /language-(\w+)/.exec(className ?? "");
          const language = match?.[1];
          const isInline = !language;

          if (isInline) {
            return (
              <code {...props} className={className}>
                {children}
              </code>
            );
          }

          const codeString =
            typeof children === "string"
              ? children.replace(/\n$/, "")
              : Array.isArray(children)
                ? children.join("")
                : "";

          return (
            <CodeWithCopy content={codeString}>
              <CodeBlock code={codeString} language={language} />
            </CodeWithCopy>
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
        pre: ({ children }) => {
          return <>{children}</>;
        },
      }}
      rehypePlugins={rehypePlugins}
      remarkPlugins={[remarkGfm, remarkMath]}
    >
      {remend(markdown)}
    </ReactMarkdown>
  );
});

Markdown.displayName = "Markdown";
