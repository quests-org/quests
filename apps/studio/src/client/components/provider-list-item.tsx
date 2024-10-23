import { Button } from "@/client/components/ui/button";
import { getProviderMetadata } from "@/client/lib/provider-metadata";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { useQuery } from "@tanstack/react-query";

import { AIProviderIcon } from "./ai-provider-icon";

const formatCredits = (credits: number) => {
  return credits.toFixed(2);
};

interface ProviderListItemProps {
  className?: string;
  onConfigure: () => void;
  provider: ClientAIProvider;
}

export function ProviderListItem({
  className,
  onConfigure,
  provider,
}: ProviderListItemProps) {
  const metadata = getProviderMetadata(provider.type);

  const { data: openRouterCredits, isLoading: isLoadingCredits } = useQuery({
    ...rpcClient.provider.credits.queryOptions({
      input: { provider: "openrouter" },
    }),
    enabled: provider.type === "openrouter",
    refetchInterval: 30_000,
  });

  return (
    <div
      className={cn(
        "rounded-lg border bg-accent/30 p-4 shadow-sm hover:bg-accent/50 transition-colors",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8">
            <AIProviderIcon type={provider.type} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{metadata.name}</h3>
              {provider.type === "openrouter" && (
                <span className="text-sm text-muted-foreground">
                  {isLoadingCredits
                    ? "Loading credits..."
                    : openRouterCredits?.credits
                      ? `$${formatCredits(openRouterCredits.credits.total_credits - openRouterCredits.credits.total_usage)} remaining`
                      : "Unable to load credits"}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {metadata.description}
            </p>
          </div>
        </div>
        <Button onClick={onConfigure} size="sm" variant="outline">
          Manage
        </Button>
      </div>
    </div>
  );
}
