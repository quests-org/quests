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
import {
  getGroupedModelsEntries,
  groupAndFilterModels,
} from "@/client/lib/group-models";
import { cn } from "@/client/lib/utils";
import { type RPCOutput, vanillaRpcClient } from "@/client/rpc/client";
import {
  type AIGatewayModel,
  type AIGatewayModelURI,
} from "@quests/ai-gateway/client";
import { AlertCircle, Check, ChevronDown, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { AIProviderIcon } from "./ai-provider-icon";
import { ModelBadges } from "./model-badges";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ModelPickerProps {
  className?: string;
  disabled?: boolean;
  errors?: RPCOutput["gateway"]["models"]["list"]["errors"];
  isError?: boolean;
  isLoading?: boolean;
  models?: AIGatewayModel.Type[];
  onAddProvider?: () => void;
  onOpenChange?: (open: boolean) => void;
  onValueChange: (value: AIGatewayModelURI.Type) => void;
  placeholder?: string;
  selectedModel?: AIGatewayModel.Type;
}

export function ModelPicker({
  className = "",
  disabled = false,
  errors,
  isError = false,
  isLoading = false,
  models,
  onAddProvider,
  onOpenChange,
  onValueChange,
  placeholder = "Select a model",
  selectedModel,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const groupedModels = useMemo(
    () => groupAndFilterModels(models ?? []),
    [models],
  );

  const hasModels = !!models?.length;
  const hasErrors = !!errors?.length;
  const isSelectDisabled = disabled || isLoading || isError;

  const hasQuestsProviderError = useMemo(
    () => errors?.some((error) => error.config.type === "quests"),
    [errors],
  );

  const getPlaceholderText = () => {
    if (isLoading) {
      return "Loading models...";
    }
    if (isError) {
      return "Failed to load models";
    }
    if (!hasModels) {
      return "No models available";
    }
    return placeholder;
  };

  const getModelDisplayValue = () => {
    if (!selectedModel) {
      return getPlaceholderText();
    }

    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="shrink-0">
              <AIProviderIcon
                className="size-3 opacity-90"
                type={selectedModel.params.provider}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{selectedModel.providerName}</p>
          </TooltipContent>
        </Tooltip>
        <span className="truncate text-xs min-w-0 flex-1">
          {selectedModel.name}
        </span>
      </div>
    );
  };

  return (
    <Popover
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        onOpenChange?.(newOpen);
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "flex items-center justify-between text-left h-auto py-1 px-1.5!",
            !selectedModel && "text-muted-foreground",
            "max-w-full",
            className,
          )}
          disabled={isSelectDisabled}
          role="combobox"
          size="sm"
          variant="ghost"
        >
          <div className="flex items-center w-full min-w-0 text-xs">
            {getModelDisplayValue()}
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput
            className="h-9"
            onValueChange={setSearchQuery}
            placeholder="Search models..."
            value={searchQuery}
          />
          <CommandList className="max-h-82">
            {!hasModels && !hasErrors ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground">
                  Connect a provider to use Quests
                </p>
                <Button
                  onClick={() => {
                    setOpen(false);
                    onAddProvider?.();
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-2 size-4" />
                  Add an AI provider
                </Button>
              </div>
            ) : (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-muted-foreground">
                    No matching models
                  </p>
                  <Button
                    onClick={() => {
                      setOpen(false);
                      onAddProvider?.();
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="mr-2 size-4" />
                    Add an AI provider
                  </Button>
                  <p className="text-xs text-muted-foreground text-center max-w-64">
                    The model you&apos;re looking for might be available from a
                    different provider
                  </p>
                </div>
              </CommandEmpty>
            )}
            {hasErrors && (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between w-full">
                    <span>Errors</span>
                    <Button
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        if (hasQuestsProviderError) {
                          void vanillaRpcClient.preferences.openSettingsWindow({
                            tab: "General",
                          });
                        } else {
                          void vanillaRpcClient.preferences.openSettingsWindow({
                            showNewProviderDialog: false,
                            tab: "Providers",
                          });
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {hasQuestsProviderError
                        ? "Check account"
                        : "Edit providers"}
                    </Button>
                  </div>
                }
              >
                {errors.map((error, index) => (
                  <CommandItem
                    className="flex items-center py-2 cursor-default data-disabled:opacity-80!"
                    disabled
                    key={index}
                  >
                    <AlertCircle className="mr-2 size-4 shrink-0 text-destructive" />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-xs">
                        <AIProviderIcon
                          className="size-3 shrink-0"
                          type={error.config.type}
                        />
                        <span className="text-muted-foreground">
                          {error.config.displayName}
                        </span>
                      </div>
                      <span className="text-xs line-clamp-2 wrap-break-word">
                        {error.message}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {isError && (
              <CommandGroup>
                <CommandItem disabled>Failed to load models</CommandItem>
              </CommandGroup>
            )}
            {hasModels &&
              getGroupedModelsEntries(groupedModels).map(
                ([groupName, modelGroup]) =>
                  modelGroup.length > 0 && (
                    <CommandGroup heading={groupName} key={groupName}>
                      {modelGroup.map((model) => (
                        <CommandItem
                          className="flex items-center justify-between py-2"
                          key={model.uri}
                          onSelect={() => {
                            onValueChange(model.uri);
                            setOpen(false);
                          }}
                          value={model.uri}
                        >
                          <div className="flex items-center">
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                selectedModel?.uri === model.uri
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">{model.name}</span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <AIProviderIcon
                                  className="size-3 shrink-0"
                                  type={model.params.provider}
                                />
                                <span>{model.providerName}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex self-start gap-1 ml-2 mt-1">
                            <ModelBadges model={model} />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ),
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
