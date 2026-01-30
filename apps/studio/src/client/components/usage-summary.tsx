import { formatNumber } from "@/client/lib/format-number";
import { isValidNumber, safeAdd } from "@/client/lib/usage-utils";
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
      inputTokenDetails: {
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        noCacheTokens: 0,
      },
      inputTokens: 0,
      outputTokenDetails: {
        reasoningTokens: 0,
        textTokens: 0,
      },
      outputTokens: 0,
      totalTokens: 0,
    };

    for (const message of messages) {
      if (message.role === "assistant" && message.metadata.usage) {
        const messageUsage = message.metadata.usage;
        if (isValidNumber(messageUsage.inputTokens)) {
          totals.inputTokens = safeAdd(
            totals.inputTokens,
            messageUsage.inputTokens,
          );
        }
        if (isValidNumber(messageUsage.outputTokens)) {
          totals.outputTokens = safeAdd(
            totals.outputTokens,
            messageUsage.outputTokens,
          );
        }
        if (isValidNumber(messageUsage.totalTokens)) {
          totals.totalTokens = safeAdd(
            totals.totalTokens,
            messageUsage.totalTokens,
          );
        }
        if (isValidNumber(messageUsage.outputTokenDetails.reasoningTokens)) {
          totals.outputTokenDetails.reasoningTokens = safeAdd(
            totals.outputTokenDetails.reasoningTokens,
            messageUsage.outputTokenDetails.reasoningTokens,
          );
        }
        if (isValidNumber(messageUsage.inputTokenDetails.cacheReadTokens)) {
          totals.inputTokenDetails.cacheReadTokens = safeAdd(
            totals.inputTokenDetails.cacheReadTokens,
            messageUsage.inputTokenDetails.cacheReadTokens,
          );
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
          inputTokenDetails: usage.inputTokenDetails,
          inputTokens: usage.inputTokens,
          outputTokenDetails: usage.outputTokenDetails,
          outputTokens: usage.outputTokens,
          totalDuration: timing.totalMsToFinishDuration,
          totalTokens: usage.totalTokens,
        }}
      >
        <div className="ml-auto flex items-center gap-2 transition-colors hover:text-warning-foreground">
          <span className="whitespace-nowrap">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </span>
          {(usage.totalTokens ?? 0) > 0 && (
            <span className="whitespace-nowrap tabular-nums">
              {formatNumber(usage.totalTokens ?? 0)}{" "}
              {usage.totalTokens === 1 ? "token" : "tokens"}
            </span>
          )}
        </div>
      </UsageStatsTooltip>
    </div>
  );
}
