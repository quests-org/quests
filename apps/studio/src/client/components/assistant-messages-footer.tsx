import {
  type SessionMessage,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { guard, sift } from "radashi";
import { useMemo, useState } from "react";

import { formatDuration } from "../lib/format-time";
import { cn } from "../lib/utils";
import { rpcClient } from "../rpc/client";
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

interface AssistantMessagesFooterProps {
  messages: SessionMessage.AssistantWithParts[];
}

interface ModelUsageData {
  aiGatewayModel?: SessionMessage.AssistantWithParts["metadata"]["aiGatewayModel"];
  label: string;
  modelId: string;
  stats: SessionMessage.Usage & {
    msToFinish: number;
    msToFirstChunk: number | undefined;
  };
}

export function AssistantMessagesFooter({
  messages,
}: AssistantMessagesFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  const isDeveloperMode = preferences?.developerMode;

  const { latestCreatedAt, messageText, modelsUsed, sources } = useMemo(() => {
    const seenSourceIds = new Set<string>();
    const allSources: (
      | SessionMessagePart.SourceDocumentPart
      | SessionMessagePart.SourceUrlPart
    )[] = [];
    let combinedText = "";
    let latestDate: Date | undefined;

    const modelMap = new Map<string, ModelUsageData>();

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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="transition-colors hover:text-muted-foreground">
                      <ModelChip
                        aiGatewayModel={model.aiGatewayModel}
                        modelId={model.modelId}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    align="start"
                    className="p-3 text-xs"
                    side="top"
                  >
                    <div className="space-y-2">
                      {getTooltipRows(model, isDeveloperMode).map(
                        (row, idx, arr) => (
                          <TooltipRow
                            key={row.label}
                            {...row}
                            divider={row.divider && idx === arr.indexOf(row)}
                          />
                        ),
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
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

const makeStatRow = (label: string, value: false | string | undefined) =>
  value && { label, value };

const formatTokenCount = (count: number) =>
  guard(() => count > 0 && count.toLocaleString());

const formatTimeMs = (ms: number | undefined) =>
  guard(() => ms !== undefined && !Number.isNaN(ms) && formatDuration(ms));

function getTooltipRows(
  model: ModelUsageData,
  isDeveloperMode?: boolean,
): { divider?: boolean; label: string; tabular?: boolean; value: string }[] {
  const infoRows = sift([
    model.aiGatewayModel?.name && {
      label: "Model:",
      value: model.aiGatewayModel.name,
    },
    model.aiGatewayModel?.params.provider && {
      label: "Provider:",
      value: model.aiGatewayModel.params.provider,
    },
    model.aiGatewayModel?.providerId && {
      label: "Model ID:",
      value: model.aiGatewayModel.providerId,
    },
  ]);

  if (!isDeveloperMode) {
    return infoRows;
  }

  const statRows = sift([
    makeStatRow(
      "Time to first chunk:",
      formatTimeMs(model.stats.msToFirstChunk),
    ),
    makeStatRow("Input tokens:", formatTokenCount(model.stats.inputTokens)),
    makeStatRow("Output tokens:", formatTokenCount(model.stats.outputTokens)),
    makeStatRow(
      "Reasoning tokens:",
      formatTokenCount(model.stats.reasoningTokens),
    ),
    makeStatRow(
      "Cached tokens:",
      formatTokenCount(model.stats.cachedInputTokens),
    ),
    makeStatRow("Total tokens:", formatTokenCount(model.stats.totalTokens)),
    makeStatRow("Duration:", formatTimeMs(model.stats.msToFinish)),
  ]).map((stat, idx) => ({
    ...stat,
    divider: idx === 0 && infoRows.length > 0,
    tabular: true as const,
  }));

  return [...infoRows, ...statRows];
}

function TooltipRow({
  divider,
  label,
  tabular,
  value,
}: {
  divider?: boolean;
  label: string;
  tabular?: boolean;
  value: string;
}) {
  return (
    <div
      className={cn("flex items-baseline justify-between gap-6", {
        "border-t pt-2": divider,
      })}
    >
      <span className="opacity-80">{label}</span>
      <span className={cn("font-medium", { "tabular-nums": tabular })}>
        {value}
      </span>
    </div>
  );
}
