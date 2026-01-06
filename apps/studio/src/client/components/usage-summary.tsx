import { formatNumber } from "@/client/lib/format-number";
import { formatDuration } from "@/client/lib/format-time";
import { type SessionMessage } from "@quests/workspace/client";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface UsageSummaryProps {
  messages: SessionMessage.WithParts[];
}

export function UsageSummary({ messages }: UsageSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const modelsUsed = useMemo(() => {
    const modelMap = new Map<string, { label: string; providerId?: string }>();

    for (const message of messages) {
      if (
        message.role === "assistant" &&
        message.metadata.modelId &&
        !message.metadata.synthetic
      ) {
        const modelId = message.metadata.modelId;
        const providerId = message.metadata.providerId;

        modelMap.set(modelId, {
          label: modelId,
          providerId,
        });
      }
    }

    return [...modelMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([modelId, data]) => ({
        id: modelId,
        label: data.label,
        provider: data.providerId,
      }));
  }, [messages]);

  const usage = useMemo(() => {
    const totals: SessionMessage.Usage = {
      cachedInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
    };

    for (const message of messages) {
      if (message.role === "assistant" && message.metadata.usage) {
        const messageUsage = message.metadata.usage;
        if (!Number.isNaN(messageUsage.inputTokens)) {
          totals.inputTokens += messageUsage.inputTokens || 0;
        }
        if (!Number.isNaN(messageUsage.outputTokens)) {
          totals.outputTokens += messageUsage.outputTokens || 0;
        }
        if (!Number.isNaN(messageUsage.totalTokens)) {
          totals.totalTokens += messageUsage.totalTokens || 0;
        }
        if (!Number.isNaN(messageUsage.reasoningTokens)) {
          totals.reasoningTokens += messageUsage.reasoningTokens || 0;
        }
        if (!Number.isNaN(messageUsage.cachedInputTokens)) {
          totals.cachedInputTokens += messageUsage.cachedInputTokens || 0;
        }
      }
    }

    return totals;
  }, [messages]);

  const timing = useMemo(() => {
    let totalMsToFinish = 0;

    for (const message of messages) {
      if (message.role === "assistant" && message.metadata.msToFinish) {
        totalMsToFinish += message.metadata.msToFinish;
      }
    }

    return {
      totalMsToFinishDuration: totalMsToFinish,
    };
  }, [messages]);

  if (usage.totalTokens === 0 && modelsUsed.length === 0) {
    return null;
  }

  return (
    <Collapsible
      className="py-2 text-[10px] text-muted-foreground"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between gap-2 text-muted-foreground/60 transition-colors hover:text-muted-foreground">
          <div className="flex w-full min-w-0 items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              {modelsUsed.length > 0 && (
                <span className="truncate">
                  {modelsUsed.map((m) => m.label).join(", ")}
                </span>
              )}
            </div>
            {usage.totalTokens > 0 && (
              <span className="whitespace-nowrap tabular-nums">
                {formatNumber(usage.totalTokens)}{" "}
                {usage.totalTokens === 1 ? "token" : "tokens"}
              </span>
            )}
          </div>
          <ChevronDown
            className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 space-y-2 text-muted-foreground/80">
          {modelsUsed.length > 0 && (
            <div className="space-y-1">
              <div className="font-medium">Models</div>
              <div className="pl-2 text-muted-foreground/60">
                {modelsUsed.map((model) => (
                  <div key={model.id}>
                    {model.provider
                      ? `${model.provider}/${model.id}`
                      : model.id}
                  </div>
                ))}
              </div>
            </div>
          )}

          {usage.totalTokens > 0 && (
            <div className="space-y-1">
              <div className="font-medium">Token Usage</div>
              <div className="space-y-1 pl-2 text-muted-foreground/60 tabular-nums">
                {usage.inputTokens > 0 && (
                  <div className="flex justify-between">
                    <span>Input:</span>
                    <span>{formatNumber(usage.inputTokens)}</span>
                  </div>
                )}
                {usage.outputTokens > 0 && (
                  <div className="flex justify-between">
                    <span>Output:</span>
                    <span>{formatNumber(usage.outputTokens)}</span>
                  </div>
                )}
                {usage.reasoningTokens > 0 && (
                  <div className="flex justify-between">
                    <span>Reasoning:</span>
                    <span>{formatNumber(usage.reasoningTokens)}</span>
                  </div>
                )}
                {usage.cachedInputTokens > 0 && (
                  <div className="flex justify-between">
                    <span>Cached:</span>
                    <span>{formatNumber(usage.cachedInputTokens)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-muted pt-1 font-medium">
                  <span>Total:</span>
                  <span>{formatNumber(usage.totalTokens)}</span>
                </div>
              </div>
            </div>
          )}

          {timing.totalMsToFinishDuration > 0 && (
            <div className="space-y-1">
              <div className="font-medium">Performance</div>
              <div className="space-y-1 pl-2 text-muted-foreground/60 tabular-nums">
                <div className="flex justify-between">
                  <span>Total duration:</span>
                  <span>{formatDuration(timing.totalMsToFinishDuration)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
