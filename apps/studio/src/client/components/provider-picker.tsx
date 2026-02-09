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
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { type ProviderMetadata } from "@quests/ai-gateway/client";
import { type AIProviderType } from "@quests/shared";
import { useAtomValue } from "jotai";
import { Award, ChevronDown } from "lucide-react";
import { useState } from "react";

import { AIProviderIcon } from "./ai-provider-icon";

const TAG_TO_LABEL: Record<ProviderMetadata["tags"][number], string> = {
  imageGeneration: "Image gen",
  recommended: "Recommended",
  webSearch: "Web search",
};

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
    captureClientEvent("provider.selected", {
      provider_type: providerType,
    });
    onSelect(providerType);
    setOpen(false);
  };

  const selectedProviderData = selectedProvider
    ? sortedProviderMetadata.find((p) => p.type === selectedProvider)
    : null;

  return (
    <Popover
      onOpenChange={(newOpen) => {
        if (newOpen) {
          captureClientEvent("provider.picker_opened");
        }
        setOpen(newOpen);
      }}
      open={open}
    >
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
        className="w-(--radix-popover-trigger-width) p-0"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        <Command>
          <CommandInput placeholder="Search providers..." />
          <CommandList>
            <CommandEmpty>Error loading providers.</CommandEmpty>
            <CommandGroup>
              {sortedProviderMetadata
                .filter((provider) => provider.canAddManually)
                .map((provider) => {
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
                      <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="shrink-0 font-medium">
                            {provider.name}
                          </span>
                          {provider.tags.map((tag) => (
                            <Badge
                              className="shrink-0"
                              key={tag}
                              variant={
                                tag === "recommended"
                                  ? "brand-outline"
                                  : "outline"
                              }
                            >
                              {tag === "recommended" && (
                                <Award className="size-3 stroke-brand" />
                              )}
                              {TAG_TO_LABEL[tag]}
                            </Badge>
                          ))}
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
