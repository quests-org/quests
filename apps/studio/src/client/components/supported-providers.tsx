import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { ALL_PROVIDERS } from "@/client/lib/provider-metadata";

export function SupportedProviders() {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-muted-foreground">Supported providers</p>
      <div className="flex flex-wrap justify-center gap-3">
        {ALL_PROVIDERS.map(({ name, type }) => (
          <div className="flex items-center gap-2" key={type}>
            <AIProviderIcon className="size-4 opacity-60" type={type} />
            <span className="text-xs text-muted-foreground">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
