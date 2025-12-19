import { type SessionMessagePart } from "@quests/workspace/client";
import { FileText } from "lucide-react";
import { memo, useState } from "react";

import { CopyButton } from "./copy-button";
import { ExternalLink } from "./external-link";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface MessageActionsRowProps {
  messageText: string;
  showActions?: boolean;
  sources?: (
    | SessionMessagePart.SourceDocumentPart
    | SessionMessagePart.SourceUrlPart
  )[];
}

function extractUniqueUrls(
  sources: (
    | SessionMessagePart.SourceDocumentPart
    | SessionMessagePart.SourceUrlPart
  )[],
): string[] {
  const urls = new Set<string>();
  for (const source of sources) {
    if (source.type === "source-url") {
      try {
        const urlObj = new URL(source.url);
        urls.add(urlObj.origin);
      } catch {
        urls.add(source.url);
      }
    }
  }
  return [...urls].slice(0, 3);
}

function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${url}&sz=32`;
  }
}

export const MessageActionsRow = memo(function MessageActionsRow({
  messageText,
  showActions = true,
  sources = [],
}: MessageActionsRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
  };

  if (!showActions && sources.length === 0) {
    return null;
  }

  const uniqueUrls = extractUniqueUrls(sources);

  return (
    <Collapsible
      className="flex flex-col gap-2 mt-2"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <div className="flex items-center gap-2">
        {showActions && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CopyButton
                className="p-1 rounded hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 text-muted-foreground"
                onCopy={handleCopy}
              />
            </TooltipTrigger>
            <TooltipContent>Copy message</TooltipContent>
          </Tooltip>
        )}
        {sources.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium shrink-0">Sources</span>
                {uniqueUrls.length > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    {uniqueUrls.map((url) => (
                      <img
                        alt=""
                        className="size-5 rounded-full bg-background"
                        key={url}
                        src={getFaviconUrl(url)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
        )}
      </div>

      {sources.length > 0 && (
        <CollapsibleContent>
          <div className="mt-2 space-y-2 pl-1">
            {sources.map((source) => {
              if (source.type === "source-url") {
                const faviconUrl = getFaviconUrl(source.url);
                return (
                  <div
                    className="flex items-center gap-2 text-sm"
                    key={source.metadata.id}
                  >
                    <img
                      alt=""
                      className="size-4 shrink-0 rounded-full bg-background"
                      src={faviconUrl}
                    />
                    <ExternalLink
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      href={source.url}
                    >
                      {source.title || source.url}
                    </ExternalLink>
                  </div>
                );
              }

              return (
                <div
                  className="flex items-center gap-2 text-sm"
                  key={source.metadata.id}
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-foreground font-medium">
                      {source.title}
                    </span>
                    {(source.filename || source.mediaType) && (
                      <span className="text-xs text-muted-foreground truncate">
                        {source.filename && source.mediaType
                          ? `${source.filename} • ${source.mediaType}`
                          : source.filename || source.mediaType}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
});
