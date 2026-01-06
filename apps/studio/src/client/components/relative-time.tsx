import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface RelativeTimeProps {
  className?: string;
  date: Date;
  updateInterval?: number;
}

export function RelativeTime({
  className,
  date,
  updateInterval = 60_000,
}: RelativeTimeProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, updateInterval);

    return () => {
      clearInterval(interval);
    };
  }, [updateInterval]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>
          {formatDistanceToNow(date, { addSuffix: true })}
        </span>
      </TooltipTrigger>
      <TooltipContent>{format(date, "PPpp")}</TooltipContent>
    </Tooltip>
  );
}
