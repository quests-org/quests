import { type AppSubdomain } from "@quests/workspace/client";
import { Check, Loader2, Pause } from "lucide-react";

import { useAppState } from "../hooks/use-app-state";
import { cn } from "../lib/utils";

interface AppStatusIconProps {
  className?: string;
  subdomain: AppSubdomain;
}

export function AppStatusIcon({
  className = "h-4 w-4",
  subdomain,
}: AppStatusIconProps) {
  const { data: appState } = useAppState({
    subdomain,
  });

  const tags = appState?.sessionActors.flatMap((actor) => actor.tags) ?? [];

  switch (true) {
    case tags.includes("agent.paused"): {
      return <Pause className={cn(className, "text-warning-foreground")} />;
    }
    case tags.includes("agent.running"): {
      return <Loader2 className={cn(className, "animate-spin")} />;
    }
    case tags.includes("agent.done"): {
      return (
        <Check
          className={cn(className, "text-green-600 dark:text-green-400")}
        />
      );
    }
    default: {
      return null;
    }
  }
}
