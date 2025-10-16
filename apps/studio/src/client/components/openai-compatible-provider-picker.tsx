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
import { OPENAI_COMPATIBLE_PROVIDERS } from "@/client/data/openai-compatible-providers";
import { ChevronDown, Server } from "lucide-react";
import { useState } from "react";

export function OpenAICompatibleProviderPicker({
  onSelect,
  selectedProvider,
}: {
  onSelect: (providerName: string | undefined) => void;
  selectedProvider: string | undefined;
}) {
  const [open, setOpen] = useState(false);

  const handleSelect = (providerName: string) => {
    onSelect(providerName);
    setOpen(false);
  };

  const selectedProviderData =
    selectedProvider && selectedProvider !== "custom"
      ? OPENAI_COMPATIBLE_PROVIDERS.find((p) => p.name === selectedProvider)
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
                <selectedProviderData.icon className="size-4" />
                {selectedProviderData.name}
              </>
            ) : selectedProvider === "custom" ? (
              <>
                <Server className="size-4" />
                Custom
              </>
            ) : (
              <>
                <Server className="size-4" />
                Choose a provider
              </>
            )}
          </div>
          <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        onWheel={(e) => {
          // Fixes scrolling on the popover content
          e.stopPropagation();
        }}
      >
        <Command>
          <CommandInput placeholder="Search providers..." />
          <CommandList>
            <CommandEmpty>No providers found.</CommandEmpty>
            <CommandGroup>
              {OPENAI_COMPATIBLE_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                return (
                  <CommandItem
                    key={provider.name}
                    onSelect={() => {
                      handleSelect(provider.name);
                    }}
                    value={provider.name}
                  >
                    <Icon className="mr-2 size-4" />
                    <div className="flex flex-col">
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {provider.description}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
              <CommandItem
                onSelect={() => {
                  handleSelect("custom");
                }}
                value="custom"
              >
                <Server className="mr-2 size-4" />
                <div className="flex flex-col">
                  <div className="font-medium">Custom</div>
                  <div className="text-xs text-muted-foreground">
                    Configure a custom provider
                  </div>
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
