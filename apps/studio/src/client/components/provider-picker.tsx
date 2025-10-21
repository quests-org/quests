import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import { RECOMMENDED_TAG } from "@quests/ai-gateway/client";
import { type AIProviderType } from "@quests/shared";
import { useAtomValue } from "jotai";
import { Award, ChevronDown } from "lucide-react";
import { useState } from "react";

import { AIProviderIcon } from "./ai-provider-icon";

export function ProviderPicker({
  onSelect,
  selectedProvider,
}: {
  onSelect: (providerType: AIProviderType | undefined) => void;
  selectedProvider: AIProviderType | undefined;
}) {
  const [open, setOpen] = useState(false);
  const { sortedProviderMetadata } = useAtomValue(providerMetadataAtom);

  const handleSelect = (providerType: AIProviderType) => {
    onSelect(providerType);
    setOpen(false);
  };

  const selectedProviderData = selectedProvider
    ? sortedProviderMetadata.find((p) => p.type === selectedProvider)
    : null;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="justify-between"
          role="combobox"
          type="button"
          variant="outline"
        >
          <div className="flex items-center gap-2">
            {selectedProviderData ? (
              <>
                <AIProviderIcon
                  className="size-4"
                  type={selectedProviderData.type}
                />
                {selectedProviderData.name}
              </>
            ) : (
              <>Choose a provider</>
            )}
          </div>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        <Command>
          <CommandInput placeholder="Search providers..." />
          <CommandList>
            <CommandEmpty>No providers found.</CommandEmpty>
            <CommandGroup>
              {sortedProviderMetadata.map((provider) => {
                return (
                  <CommandItem
                    key={provider.type}
                    onSelect={() => {
                      handleSelect(provider.type);
                    }}
                    value={provider.name}
                  >
                    <AIProviderIcon
                      className="mr-2 size-5 shrink-0"
                      type={provider.type}
                    />
                    <div className="flex flex-col gap-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name}</span>
                        {provider.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {provider.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant={
                                  tag === RECOMMENDED_TAG
                                    ? "brand-outline"
                                    : "outline"
                                }
                              >
                                {tag === RECOMMENDED_TAG && (
                                  <Award className="size-3 stroke-brand" />
                                )}
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {provider.description}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
