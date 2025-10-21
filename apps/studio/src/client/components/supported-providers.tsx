import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { useAtomValue } from "jotai";

export function SupportedProviders() {
  const { sortedProviderMetadata } = useAtomValue(providerMetadataAtom);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-muted-foreground">Supported providers</p>
      <div className="flex flex-wrap justify-center gap-3">
        {sortedProviderMetadata.map((metadata) => (
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
      </div>
    </div>
  );
}
