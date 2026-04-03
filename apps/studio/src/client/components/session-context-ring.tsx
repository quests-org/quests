import { formatNumber } from "@/client/lib/format-number";
import { rpcClient } from "@/client/rpc/client";
import { type AppSubdomain, type StoreId } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const CONTEXT_WINDOW = 200_000;
const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SessionContextRing({
  selectedSessionId,
  subdomain,
}: {
  selectedSessionId: StoreId.Session;
  subdomain: AppSubdomain;
}) {
  const { data } = useQuery(
    rpcClient.workspace.session.live.contextTokens.experimental_liveOptions({
      input: { sessionId: selectedSessionId, subdomain },
    }),
  );

  const tokens = data?.inputTokens ?? 0;
  const ratio = Math.min(tokens / CONTEXT_WINDOW, 1);
  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  const percentUsed = Math.round(ratio * 100);

  let strokeColor = "text-warning-foreground/60";
  if (ratio >= 0.9) {
    strokeColor = "text-destructive";
  } else if (ratio >= 0.7) {
    strokeColor = "text-warning-foreground";
  }

  return (
    <Tooltip>
      <TooltipTrigger className="flex items-center">
        <svg
          className={strokeColor}
          fill="none"
          height={18}
          viewBox="0 0 18 18"
          width={18}
        >
          <circle
            className="opacity-20"
            cx={9}
            cy={9}
            r={RADIUS}
            stroke="currentColor"
            strokeWidth={2}
          />
          <circle
            cx={9}
            cy={9}
            r={RADIUS}
            stroke="currentColor"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth={2}
            style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
          />
        </svg>
      </TooltipTrigger>
      <TooltipContent align="end" className="p-3 text-xs" side="top">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-6">
            <span className="opacity-80">Context window:</span>
            <span className="font-medium tabular-nums">
              {formatNumber(tokens)} / {formatNumber(CONTEXT_WINDOW)} tokens
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-6">
            <span className="opacity-80">Usage:</span>
            <span className="font-medium tabular-nums">{percentUsed}%</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
