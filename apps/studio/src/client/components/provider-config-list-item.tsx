import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { type ProviderMetadata } from "@quests/ai-gateway/client";
import { useQuery } from "@tanstack/react-query";

import { AIProviderIcon } from "./ai-provider-icon";

const formatCredits = (credits: number) => {
  return credits.toFixed(2);
};

export function ProviderConfigListItem({
  className,
  config,
  metadata,
  onConfigure,
}: {
  className?: string;
  config: ClientAIProviderConfig;
  metadata?: ProviderMetadata;
  onConfigure: () => void;
}) {
  const { data: openRouterCredits, isLoading: isLoadingCredits } = useQuery({
    ...rpcClient.providerConfig.credits.queryOptions({
      input: { id: config.id },
    }),
    // Only OpenRouter supports credit querying right now
    enabled: config.type === "openrouter",
    refetchInterval: 30_000,
  });

  const displayName = config.displayName || metadata?.name;
  const originalName = metadata?.name;
  const showOriginalName =
    config.displayName && originalName && config.displayName !== originalName;

  return (
    <div
      className={cn(
        "rounded-lg border bg-accent/30 p-4 shadow-sm transition-colors hover:bg-accent/50",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center">
            <AIProviderIcon type={config.type} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-medium text-foreground">{displayName}</h3>
            {showOriginalName && (
              <p className="text-sm text-muted-foreground">{originalName}</p>
            )}
            {config.type === "openai-compatible" && config.baseURL ? (
              <p className="font-mono text-xs text-muted-foreground">
                {config.baseURL}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {metadata?.description ?? "Metadata not found"}
              </p>
            )}
            {config.type === "openrouter" && (
              <p className="text-sm text-muted-foreground">
                {isLoadingCredits
                  ? "Loading credits..."
                  : openRouterCredits?.credits
                    ? `$${formatCredits(openRouterCredits.credits.total_credits - openRouterCredits.credits.total_usage)} remaining`
                    : "Unable to load credits"}
              </p>
            )}
          </div>
        </div>
        <Button
          className="shrink-0"
          onClick={onConfigure}
          size="sm"
          variant="outline"
        >
          Manage
        </Button>
      </div>
    </div>
  );
}
