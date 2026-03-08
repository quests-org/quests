import { formatNumber } from "@/client/lib/format-number";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { DeveloperModeBadge } from "./tool-part/developer-mode-badge";
import { Skeleton } from "./ui/skeleton";
import { UsageStatsTooltip } from "./usage-stats-tooltip";

export function ProjectUsageSummary({
  project,
}: {
  project: WorkspaceAppProject;
}) {
  const { data } = useQuery(
    rpcClient.workspace.project.live.usageSummary.experimental_liveOptions({
      input: { subdomain: project.subdomain },
    }),
  );

  return (
    <div className="flex min-w-0 items-center gap-2 text-[10px] text-warning-foreground/60">
      <DeveloperModeBadge />
      {data ? (
        <UsageStatsTooltip
          stats={{
            inputTokenDetails: data.inputTokenDetails,
            inputTokens: data.inputTokens,
            outputTokenDetails: data.outputTokenDetails,
            outputTokens: data.outputTokens,
            totalDuration: data.msToFinish,
            totalTokens: data.totalTokens,
          }}
        >
          <span className="min-w-0 truncate text-[10px] transition-colors hover:text-warning-foreground">
            {data.messageCount}{" "}
            {data.messageCount === 1 ? "message" : "messages"}
            {data.totalTokens > 0 &&
              ` · ${formatNumber(data.totalTokens)} ${data.totalTokens === 1 ? "token" : "tokens"}`}
          </span>
        </UsageStatsTooltip>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-3 w-16 rounded-sm bg-warning-foreground/20" />
          <Skeleton className="h-3 w-20 rounded-sm bg-warning-foreground/20" />
        </div>
      )}
    </div>
  );
}
