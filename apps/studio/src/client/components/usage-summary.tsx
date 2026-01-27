import { formatNumber } from "@/client/lib/format-number";
import { type SessionMessage } from "@quests/workspace/client";
import { useMemo } from "react";

import { cn } from "../lib/utils";
import { UsageStatsTooltip } from "./usage-stats-tooltip";

export function UsageSummary({
  className,
  messages,
}: {
  className?: string;
  messages: SessionMessage.WithParts[];
}) {
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

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 text-[10px] text-warning-foreground/60",
        className,
      )}
    >
      <UsageStatsTooltip
        stats={{
          cachedInputTokens: usage.cachedInputTokens,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          reasoningTokens: usage.reasoningTokens,
          totalDuration: timing.totalMsToFinishDuration,
          totalTokens: usage.totalTokens,
        }}
      >
        <div className="ml-auto flex items-center gap-2 transition-colors hover:text-warning-foreground">
          <span className="whitespace-nowrap">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </span>
          {usage.totalTokens > 0 && (
            <span className="whitespace-nowrap tabular-nums">
              {formatNumber(usage.totalTokens)}{" "}
              {usage.totalTokens === 1 ? "token" : "tokens"}
            </span>
          )}
        </div>
      </UsageStatsTooltip>
    </div>
  );
}
