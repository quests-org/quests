import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { useAtomValue } from "jotai";

export function SupportedProviders() {
  const { sortedProviderMetadata } = useAtomValue(providerMetadataAtom);

  const featuredProviders = sortedProviderMetadata.filter((metadata) =>
    ["anthropic", "google", "openai", "openrouter", "z-ai"].includes(
      metadata.type,
    ),
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-muted-foreground">
        Supports 20+ AI services including:
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {featuredProviders.map((metadata) => (
          <div className="flex items-center gap-2" key={metadata.type}>
            <AIProviderIcon
              className="size-4 opacity-60"
              type={metadata.type}
            />
            <span className="text-xs text-muted-foreground">
              {metadata.name}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <AIProviderIcon
            className="size-4 opacity-60"
            type="openai-compatible"
          />
          <span className="text-xs text-muted-foreground">Custom</span>
        </div>
        <div className="flex items-center gap-2">
          <AIProviderIcon className="size-4 opacity-60" type="ollama" />
          <span className="text-xs text-muted-foreground">Local</span>
        </div>
      </div>
    </div>
  );
}
