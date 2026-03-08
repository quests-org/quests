import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "./ui/skeleton";
import { UsageStatsTooltip, UsageSummaryText } from "./usage-stats-tooltip";

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
      {data ? (
        <UsageStatsTooltip
          messageCount={data.messageCount}
          stats={{
            inputTokenDetails: data.inputTokenDetails,
            inputTokens: data.inputTokens,
            outputTokenDetails: data.outputTokenDetails,
            outputTokens: data.outputTokens,
            totalDuration: data.msToFinish,
            totalTokens: data.totalTokens,
          }}
        >
          <UsageSummaryText
            className="min-w-0 truncate text-[10px] transition-colors hover:text-warning-foreground"
            messageCount={data.messageCount}
            totalTokens={data.totalTokens}
          />
        </UsageStatsTooltip>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          <Skeleton className="h-3 w-8 rounded-sm bg-warning-foreground/20" />
          <Skeleton className="h-3 w-10 rounded-sm bg-warning-foreground/20" />
        </div>
      )}
    </div>
  );
}
