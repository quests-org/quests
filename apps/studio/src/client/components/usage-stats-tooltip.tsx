import { formatNumber } from "@/client/lib/format-number";
import { formatDuration } from "@/client/lib/format-time";
import { isValidNumber } from "@/client/lib/usage-utils";
import { type SessionMessage } from "@quests/workspace/client";
import { type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface StatRow {
  formatter: (value: number) => string;
  label: string;
  value: number | undefined;
}

interface UsageStats extends SessionMessage.Usage {
  msToFirstChunk?: number;
  totalDuration?: number;
}

export function UsageStatsTooltip({
  children,
  stats,
}: {
  children: ReactNode;
  stats: UsageStats;
}) {
  const rows: StatRow[] = [
    {
      formatter: formatDuration,
      label: "Time to first chunk:",
      value: stats.msToFirstChunk,
    },
    {
      formatter: formatNumber,
      label: "Input tokens:",
      value: stats.inputTokens,
    },
    {
      formatter: formatNumber,
      label: "Output tokens:",
      value: stats.outputTokens,
    },
    {
      formatter: formatNumber,
      label: "Reasoning tokens:",
      value: stats.outputTokenDetails.reasoningTokens,
    },
    {
      formatter: formatNumber,
      label: "Cached tokens:",
      value: stats.inputTokenDetails.cacheReadTokens,
    },
    {
      formatter: formatNumber,
      label: "Total tokens:",
      value: stats.totalTokens,
    },
    {
      formatter: formatDuration,
      label: "Duration:",
      value: stats.totalDuration,
    },
  ];

  const visibleRows = rows.filter((row) => isValidNumber(row.value));

  if (visibleRows.length === 0) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent align="start" className="p-3 text-xs" side="top">
        <div className="space-y-2">
          {visibleRows.map((row) => (
            <div
              className="flex items-baseline justify-between gap-6"
              key={row.label}
            >
              <span className="opacity-80">{row.label}</span>
              <span className="font-medium tabular-nums">
                {row.value === undefined ? "" : row.formatter(row.value)}
              </span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
