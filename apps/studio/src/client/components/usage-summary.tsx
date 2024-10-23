import { formatNumber } from "@/client/lib/format-number";
import { formatDuration } from "@/client/lib/format-time";
import { type SessionMessage } from "@quests/workspace/client";
import { useMemo } from "react";

interface UsageSummaryProps {
  messages: SessionMessage.WithParts[];
}

export function UsageSummary({ messages }: UsageSummaryProps) {
  const modelsUsed = useMemo(() => {
    const modelMap = new Map<string, { label: string; providerId?: string }>();

    for (const message of messages) {
      if (message.role === "assistant" && message.metadata.modelId) {
        const modelId = message.metadata.modelId;
        const providerId = message.metadata.providerId;

        // We use this internally when making an assistant message manually
        // TODO remove this once we have our own message type
        if (modelId.toLowerCase() === "system") {
          continue;
        }

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
    let totalMsToFirstChunk = 0;
    let totalCompletionTokens = 0;
    let totalCompletionTime = 0;
    let requestCount = 0;

    for (const message of messages) {
      if (message.role === "assistant") {
        if (message.metadata.msToFinish) {
          totalMsToFinish += message.metadata.msToFinish;
          requestCount++;
        }
        if (message.metadata.msToFirstChunk) {
          totalMsToFirstChunk += message.metadata.msToFirstChunk;
        }
        if (
          message.metadata.completionTokensPerSecond &&
          message.metadata.msToFinish
        ) {
          const outputTokens = message.metadata.usage?.outputTokens || 0;
          if (outputTokens > 0) {
            totalCompletionTokens += outputTokens;
            totalCompletionTime += message.metadata.msToFinish;
          }
        }
      }
    }

    const avgMsToFinish = requestCount > 0 ? totalMsToFinish / requestCount : 0;
    const avgMsToFirstChunk =
      requestCount > 0 ? totalMsToFirstChunk / requestCount : 0;
    const avgTokensPerSecond =
      totalCompletionTime > 0
        ? (totalCompletionTokens / totalCompletionTime) * 1000
        : 0;

    return {
      avgMsToFinish,
      avgMsToFirstChunk,
      avgTokensPerSecond,
      requestCount,
    };
  }, [messages]);

  if (usage.totalTokens === 0 && modelsUsed.length === 0) {
    return null;
  }

  return (
    <div className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-2 group">
      <div className="flex items-center justify-between gap-6">
        {modelsUsed.length > 0 && (
          <div>{modelsUsed.map((m) => m.label).join(", ")}</div>
        )}

        {usage.totalTokens > 0 && (
          <div className="tabular-nums text-right">
            {formatNumber(usage.totalTokens)}{" "}
            {usage.totalTokens === 1 ? "token" : "tokens"}
          </div>
        )}
      </div>

      <div className="invisible group-hover:visible flex items-center justify-between gap-6 mt-1">
        {modelsUsed.length > 0 && (
          <div>
            {modelsUsed
              .map((m) => (m.provider ? `${m.provider}/${m.id}` : m.id))
              .join(", ")}
          </div>
        )}

        {usage.totalTokens > 0 && (
          <div className="tabular-nums text-right flex items-center gap-2">
            {usage.inputTokens > 0 && (
              <span>
                {formatNumber(usage.inputTokens)} in +{" "}
                {formatNumber(usage.outputTokens)} out
              </span>
            )}
            {usage.reasoningTokens > 0 && (
              <span>{formatNumber(usage.reasoningTokens)} reasoning</span>
            )}
            {usage.cachedInputTokens > 0 && (
              <span>{formatNumber(usage.cachedInputTokens)} cached</span>
            )}
          </div>
        )}
      </div>

      {timing.requestCount > 0 && (
        <div className="invisible group-hover:visible flex items-center justify-between gap-6 mt-1">
          <div>Avg. Performance</div>
          <div className="tabular-nums text-right flex items-center gap-2">
            {timing.avgTokensPerSecond > 0 && (
              <span>{Math.round(timing.avgTokensPerSecond)} tok/s</span>
            )}
            {timing.avgMsToFirstChunk > 0 && (
              <span>{formatDuration(timing.avgMsToFirstChunk)} to start</span>
            )}
            {timing.avgMsToFinish > 0 && (
              <span>{formatDuration(timing.avgMsToFinish)} duration</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
