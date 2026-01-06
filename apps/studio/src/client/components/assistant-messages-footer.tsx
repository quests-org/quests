import {
  type SessionMessage,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { FileText } from "lucide-react";
import { useMemo, useState } from "react";

import { CopyButton } from "./copy-button";
import { ExternalLink } from "./external-link";
import { ModelChip } from "./model-chip";
import { RelativeTime } from "./relative-time";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UsageStatsTooltip } from "./usage-stats-tooltip";

interface AssistantMessagesFooterProps {
  messages: SessionMessage.AssistantWithParts[];
}

export function AssistantMessagesFooter({
  messages,
}: AssistantMessagesFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { latestCreatedAt, messageText, modelsUsed, sources } = useMemo(() => {
    const seenSourceIds = new Set<string>();
    const allSources: (
      | SessionMessagePart.SourceDocumentPart
      | SessionMessagePart.SourceUrlPart
    )[] = [];
    let combinedText = "";
    let latestDate: Date | undefined;

    const modelMap = new Map<
      string,
      {
        aiGatewayModel?: SessionMessage.AssistantWithParts["metadata"]["aiGatewayModel"];
        label: string;
        modelId: string;
        stats: {
          cachedInputTokens: number;
          inputTokens: number;
          msToFinish: number;
          msToFirstChunk: number | undefined;
          outputTokens: number;
          reasoningTokens: number;
          totalTokens: number;
        };
      }
    >();

    for (const message of messages) {
      for (const part of message.parts) {
        if (
          (part.type === "source-document" || part.type === "source-url") &&
          !seenSourceIds.has(part.sourceId)
        ) {
          seenSourceIds.add(part.sourceId);
          allSources.push(part);
        }
        if (part.type === "text") {
          combinedText += part.text;
        }
      }

      if (!latestDate || message.metadata.createdAt > latestDate) {
        latestDate = message.metadata.createdAt;
      }

      if (message.metadata.modelId && !message.metadata.synthetic) {
        const modelId = message.metadata.modelId;
        const aiGatewayModel = message.metadata.aiGatewayModel;
        const key = aiGatewayModel?.uri ?? modelId;
        const label = aiGatewayModel?.name ?? modelId;

        const existing = modelMap.get(key);
        const usage = message.metadata.usage;

        modelMap.set(key, {
          aiGatewayModel,
          label,
          modelId,
          stats: {
            cachedInputTokens:
              (existing?.stats.cachedInputTokens || 0) +
              (usage?.cachedInputTokens || 0),
            inputTokens:
              (existing?.stats.inputTokens || 0) + (usage?.inputTokens || 0),
            msToFinish:
              (existing?.stats.msToFinish || 0) +
              (message.metadata.msToFinish || 0),
            msToFirstChunk:
              existing?.stats.msToFirstChunk ?? message.metadata.msToFirstChunk,
            outputTokens:
              (existing?.stats.outputTokens || 0) + (usage?.outputTokens || 0),
            reasoningTokens:
              (existing?.stats.reasoningTokens || 0) +
              (usage?.reasoningTokens || 0),
            totalTokens:
              (existing?.stats.totalTokens || 0) + (usage?.totalTokens || 0),
          },
        });
      }
    }

    return {
      latestCreatedAt: latestDate,
      messageText: combinedText,
      modelsUsed: [...modelMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, data]) => data),
      sources: allSources,
    };
  }, [messages]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
  };

  const uniqueUrls = extractUniqueUrls(sources);

  return (
    <Collapsible
      className="group mt-2 flex flex-col gap-2"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <CopyButton
              className="rounded p-0.5 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
              onCopy={handleCopy}
            />
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>
        {sources.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs font-medium">Sources</span>
                {uniqueUrls.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1">
                    {uniqueUrls.map((url) => (
                      <img
                        alt={`Favicon for ${url}`}
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
        {modelsUsed.length > 0 && (
          <div className="flex min-w-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            {modelsUsed.map((model, index) => (
              <div
                className="flex min-w-0 items-center gap-1"
                key={model.aiGatewayModel?.uri ?? model.modelId}
              >
                {index > 0 && (
                  <span className="mr-1 text-muted-foreground/30">•</span>
                )}
                <UsageStatsTooltip
                  stats={{
                    cachedInputTokens: model.stats.cachedInputTokens,
                    inputTokens: model.stats.inputTokens,
                    msToFirstChunk: model.stats.msToFirstChunk,
                    outputTokens: model.stats.outputTokens,
                    reasoningTokens: model.stats.reasoningTokens,
                    totalDuration: model.stats.msToFinish,
                    totalTokens: model.stats.totalTokens,
                  }}
                >
                  <div className="transition-colors hover:text-muted-foreground">
                    <ModelChip
                      aiGatewayModel={model.aiGatewayModel}
                      modelId={model.modelId}
                    />
                  </div>
                </UsageStatsTooltip>
              </div>
            ))}
          </div>
        )}
        {latestCreatedAt && (
          <RelativeTime
            className="ml-auto cursor-default text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            date={latestCreatedAt}
          />
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
                      className="text-muted-foreground transition-colors hover:text-foreground"
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
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {source.title}
                    </span>
                    {(source.filename || source.mediaType) && (
                      <span className="truncate text-xs text-muted-foreground">
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
