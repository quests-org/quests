import { openFilePreviewAtom } from "@/client/atoms/file-preview";
import { useSetAtom } from "jotai";
import { ImageIcon } from "lucide-react";
import { memo, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remend from "remend";

import { useHashLinkScroll } from "../hooks/use-hash-link-scroll";
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

  return (
    <div dangerouslySetInnerHTML={{ __html: highlightedHtml.join("\n") }} />
  );
};

const ALLOWED_IMAGE_PATTERNS = [
  /^data:/,
  /^http:\/\/.*\.localhost(:\d+)?\//,
  /^https:\/\/images\.google\.com\//,
  /^https:\/\/github\.com\//,
  /^https:\/\/.*\.github\.com\//,
  /^https:\/\/.*\.githubusercontent\.com\//,
];

const isImageAllowed = (src: string | undefined): boolean => {
  if (!src) {
    return false;
  }
  if (src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) {
    return true;
  }
  return ALLOWED_IMAGE_PATTERNS.some((pattern) => pattern.test(src));
};

const ImagePlaceholder = ({ alt, src }: { alt?: string; src?: string }) => (
  <div className="flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
    <ImageIcon className="size-4 shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="truncate">{alt || "Image"}</div>
      {src && <div className="truncate text-xs opacity-70">{src}</div>}
    </div>
  </div>
);

export const Markdown = memo(({ allowRawHtml, markdown }: MarkdownProps) => {
  const openFilePreview = useSetAtom(openFilePreviewAtom);

  const handleImageClick = useCallback(
    (event: React.MouseEvent<HTMLImageElement>) => {
      const src = event.currentTarget.src;
      const alt = event.currentTarget.alt || "image";
      if (src) {
        openFilePreview({ filename: alt, url: src });
      }
    },
    [openFilePreview],
  );

  const handleHashLinkClick = useHashLinkScroll();

  const rehypePlugins = allowRawHtml ? [rehypeRaw, rehypeKatex] : [rehypeKatex];

  return (
    <ReactMarkdown
      components={{
        a: ({ children, className, href, ...props }) => {
          if (href?.startsWith("#")) {
            return (
              // eslint-disable-next-line no-restricted-syntax
              <a
                {...props}
                className={cn("cursor-pointer!", className)}
                href={href}
                onClick={handleHashLinkClick}
              >
                {children}
              </a>
            );
          }

          return (
            <ExternalLink {...props} className={className} href={href}>
              {children}
            </ExternalLink>
          );
        },
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
        img: ({ alt, className, node: _node, ref: _ref, src, ...props }) => {
          if (!isImageAllowed(src)) {
            return <ImagePlaceholder alt={alt} src={src} />;
          }

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
