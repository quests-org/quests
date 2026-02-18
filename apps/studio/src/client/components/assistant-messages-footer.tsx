import {
  type AppSubdomain,
  type SessionMessage,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { sift } from "radashi";
import { useMemo, useState } from "react";

import { formatNumber } from "../lib/format-number";
import { formatDuration } from "../lib/format-time";
import { cn } from "../lib/utils";
import { rpcClient } from "../rpc/client";
import { CopyButton } from "./copy-button";
import { ExternalLink } from "./external-link";
import { Favicon } from "./favicon";
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
  subdomain: AppSubdomain;
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
  subdomain,
}: AssistantMessagesFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  const isDeveloperMode = preferences?.developerMode;

  const messageRefs = useMemo(
    () =>
      messages.map((m) => ({
        messageId: m.id,
        sessionId: m.metadata.sessionId,
      })),
    [messages],
  );

  const { data: usageSummary } = useQuery({
    ...rpcClient.workspace.message.usageSummary.queryOptions({
      input: { messages: messageRefs, subdomain },
    }),
    enabled: isDeveloperMode,
  });

  const { latestCreatedAt, messageText, modelsUsed, sources, totalDuration } =
    useMemo(() => {
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

          modelMap.set(key, {
            aiGatewayModel,
            label,
            modelId,
            stats: {
              inputTokenDetails: {
                cacheReadTokens:
                  (existing?.stats.inputTokenDetails.cacheReadTokens ?? 0) +
                  (message.metadata.usage?.inputTokenDetails.cacheReadTokens ??
                    0),
                cacheWriteTokens:
                  (existing?.stats.inputTokenDetails.cacheWriteTokens ?? 0) +
                  (message.metadata.usage?.inputTokenDetails.cacheWriteTokens ??
                    0),
                noCacheTokens:
                  (existing?.stats.inputTokenDetails.noCacheTokens ?? 0) +
                  (message.metadata.usage?.inputTokenDetails.noCacheTokens ??
                    0),
              },
              inputTokens:
                (existing?.stats.inputTokens ?? 0) +
                (message.metadata.usage?.inputTokens ?? 0),
              msToFinish:
                (existing?.stats.msToFinish ?? 0) +
                (message.metadata.msToFinish ?? 0),
              msToFirstChunk:
                existing?.stats.msToFirstChunk ??
                message.metadata.msToFirstChunk,
              outputTokenDetails: {
                reasoningTokens:
                  (existing?.stats.outputTokenDetails.reasoningTokens ?? 0) +
                  (message.metadata.usage?.outputTokenDetails.reasoningTokens ??
                    0),
                textTokens:
                  (existing?.stats.outputTokenDetails.textTokens ?? 0) +
                  (message.metadata.usage?.outputTokenDetails.textTokens ?? 0),
              },
              outputTokens:
                (existing?.stats.outputTokens ?? 0) +
                (message.metadata.usage?.outputTokens ?? 0),
              totalTokens:
                (existing?.stats.totalTokens ?? 0) +
                (message.metadata.usage?.totalTokens ?? 0),
            },
          });
        }
      }

      const totalMs = [...modelMap.values()].reduce(
        (acc, model) => acc + model.stats.msToFinish,
        0,
      );

      return {
        latestCreatedAt: latestDate,
        messageText: combinedText,
        modelsUsed: [...modelMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, data]) => data),
        sources: allSources,
        totalDuration: totalMs,
      };
    }, [messages]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
  };

  const uniqueUrls = extractUniqueUrls(sources);

  return (
    <Collapsible
      className="mt-2 flex flex-col gap-2"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <div
        className={cn(
          "flex items-center gap-2 transition-opacity",
          sources.length > 0
            ? "opacity-100"
            : "opacity-0 group-hover/assistant-message-footer:opacity-100",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <CopyButton className="text-muted-foreground" onCopy={handleCopy} />
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>
        {totalDuration > 0 && (
          <span className="cursor-default text-xs text-muted-foreground">
            {formatDuration(totalDuration)}
          </span>
        )}
        {sources.length > 0 && (
          <CollapsibleTrigger asChild>
            <Button size="sm" variant="ghost">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs font-medium">Sources</span>
                {uniqueUrls.length > 0 && (
                  <div className="flex shrink-0 items-center gap-1">
                    {uniqueUrls.map((url) => (
                      <Favicon className="size-5" key={url} url={url} />
                    ))}
                  </div>
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
        )}
        {modelsUsed.length > 0 && (
          <div className="flex min-w-0 items-center gap-2">
            {modelsUsed.map((model, index) => (
              <div
                className="flex min-w-0 items-center gap-1.5"
                key={model.aiGatewayModel?.uri ?? model.modelId}
              >
                {index > 0 && (
                  <span className="mr-1 text-muted-foreground/30">•</span>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
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
                      {getModelInfoRows(model).map((row) => (
                        <TooltipRow key={row.label} {...row} />
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        )}
        {isDeveloperMode && usageSummary && (
          <UsageStatsTooltip
            stats={{
              inputTokenDetails: usageSummary.inputTokenDetails,
              inputTokens: usageSummary.inputTokens,
              outputTokenDetails: usageSummary.outputTokenDetails,
              outputTokens: usageSummary.outputTokens,
              totalDuration: usageSummary.msToFinish,
              totalTokens: usageSummary.totalTokens,
            }}
          >
            <div className="flex items-center gap-2 text-[10px] text-warning-foreground/60 transition-colors hover:text-warning-foreground">
              <span className="whitespace-nowrap">
                {usageSummary.messageCount}{" "}
                {usageSummary.messageCount === 1 ? "message" : "messages"}
              </span>
              {usageSummary.totalTokens > 0 && (
                <span className="whitespace-nowrap tabular-nums">
                  {formatNumber(usageSummary.totalTokens)}{" "}
                  {usageSummary.totalTokens === 1 ? "token" : "tokens"}
                </span>
              )}
            </div>
          </UsageStatsTooltip>
        )}
        {latestCreatedAt && (
          <RelativeTime
            className="ml-auto cursor-default text-xs text-muted-foreground"
            date={latestCreatedAt}
          />
        )}
      </div>

      {sources.length > 0 && (
        <CollapsibleContent>
          <div className="mt-2 space-y-2 pl-1">
            {sources.map((source) => {
              if (source.type === "source-url") {
                return (
                  <div
                    className="flex items-center gap-2 text-sm"
                    key={source.metadata.id}
                  >
                    <Favicon url={source.url} />
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

function getModelInfoRows(model: ModelUsageData): {
  label: string;
  value: string;
}[] {
  return sift([
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
}

function TooltipRow({
  isWarning,
  label,
  tabular,
  value,
}: {
  isWarning?: boolean;
  label: string;
  tabular?: boolean;
  value: string;
}) {
  return (
    <div
      className={cn("flex items-baseline justify-between gap-6", {
        "text-warning-foreground": isWarning,
      })}
    >
      <span className="opacity-80">{label}</span>
      <span className={cn("font-medium", { "tabular-nums": tabular })}>
        {value}
      </span>
    </div>
  );
}
