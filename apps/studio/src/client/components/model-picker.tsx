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
import { getProviderMetadata } from "@/client/lib/provider-metadata";
import { cn } from "@/client/lib/utils";
import { type AIGatewayModel } from "@quests/ai-gateway";
import { AlertCircle, Check, ChevronDown, CircleOff, Plus } from "lucide-react";
import { fork } from "radashi";
import { useMemo, useState } from "react";

import { vanillaRpcClient } from "../rpc/client";
import { AIProviderIcon } from "./ai-provider-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ModelPickerProps {
  className?: string;
  disabled?: boolean;
  errors?: string[];
  isError?: boolean;
  isLoading?: boolean;
  models?: AIGatewayModel.Type[];
  onValueChange: (value: AIGatewayModel.URI) => void;
  placeholder?: string;
  value?: AIGatewayModel.URI;
}

const groupAndFilterModels = (models: AIGatewayModel.Type[]) => {
  const [recommended, notRecommended] = fork(
    models,
    (model) =>
      model.tags.includes("recommended") && model.tags.includes("coding"),
  );

  const [defaultRecommended, nonDefaultRecommended] = fork(
    recommended,
    (model) => model.tags.includes("default"),
  );

  const [supportsTools, doesNotSupportTools] = fork(notRecommended, (model) =>
    model.features.includes("tools"),
  );

  const [newModels, notNewModels] = fork(supportsTools, (model) =>
    model.tags.includes("new"),
  );

  const [legacy, notLegacy] = fork(notNewModels, (model) =>
    model.tags.includes("legacy"),
  );

  /* eslint-disable perfectionist/sort-objects */
  return {
    Recommended: [...defaultRecommended, ...nonDefaultRecommended],
    New: newModels,
    Other: notLegacy,
    "May not support tools": doesNotSupportTools,
    Legacy: legacy,
  };
  /* eslint-enable perfectionist/sort-objects */
};

export function ModelPicker({
  className = "",
  disabled = false,
  errors,
  isError = false,
  isLoading = false,
  models,
  onValueChange,
  placeholder = "Select a model",
  value,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedModel = models?.find((model) => model.uri === value);

  const groupedModels = useMemo(
    () =>
      models
        ? groupAndFilterModels(models)
        : ({} as ReturnType<typeof groupAndFilterModels>),
    [models],
  );

  const isSelectDisabled = disabled || isLoading || isError;

  const getPlaceholderText = () => {
    if (isLoading) {
      return "Loading models...";
    }
    if (isError) {
      return "Failed to load models";
    }
    if (!models || models.length === 0) {
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
            <p>{getProviderMetadata(selectedModel.params.provider).name}</p>
          </TooltipContent>
        </Tooltip>
        <span className="truncate text-xs min-w-0 flex-1">
          {selectedModel.canonicalId}
        </span>
      </div>
    );
  };

  const renderModelTags = (model: AIGatewayModel.Type) => {
    const tags = [];

    if (model.tags.includes("legacy")) {
      tags.push(
        <Badge className="text-xs px-1 py-0" key="legacy" variant="outline">
          legacy
        </Badge>,
      );
    }

    if (model.tags.includes("new")) {
      tags.push(
        <Badge className="text-xs px-1 py-0" key="new" variant="outline">
          new
        </Badge>,
      );
    }

    if (!model.features.includes("tools")) {
      tags.push(
        <Badge
          className="text-xs px-1 py-0"
          key="no-tools"
          variant="destructive"
        >
          <CircleOff className="mr-0.5 size-3" />
          tools
        </Badge>,
      );
    }

    return tags;
  };

  if (!errors && models && models.length === 0) {
    return (
      <Button
        disabled={disabled}
        onClick={() => {
          void vanillaRpcClient.preferences.openSettingsWindow({
            showNewProviderDialog: true,
            tab: "Providers",
          });
        }}
        size="sm"
        variant="outline"
      >
        Add an AI provider
      </Button>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
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
          <div className="flex items-center w-full min-w-0">
            {getModelDisplayValue()}
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput className="h-9" placeholder="Search models..." />
          <CommandList className="max-h-82">
            <CommandEmpty>
              <div className="flex flex-col items-center gap-3 py-6">
                <p className="text-sm text-muted-foreground">No models found</p>
                <Button
                  onClick={() => {
                    void vanillaRpcClient.preferences.openSettingsWindow({
                      showNewProviderDialog: true,
                      tab: "Providers",
                    });
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-2 size-4" />
                  Add AI provider
                </Button>
                <p className="text-xs text-muted-foreground text-center max-w-64">
                  The model you&apos;re looking for might be available from a
                  different provider
                </p>
              </div>
            </CommandEmpty>
            {errors && errors.length > 0 && (
              <CommandGroup heading="Errors">
                {errors.map((error, index) => (
                  <CommandItem
                    className="flex items-center py-2 cursor-default data-[disabled]:opacity-80!"
                    disabled
                    key={index}
                  >
                    <AlertCircle className="mr-2 size-4 shrink-0 text-destructive" />
                    <span className="text-xs line-clamp-2 break-words">
                      {error}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {isLoading && (
              <CommandGroup>
                <CommandItem disabled>Loading models...</CommandItem>
              </CommandGroup>
            )}
            {isError && (
              <CommandGroup>
                <CommandItem disabled>Failed to load models</CommandItem>
              </CommandGroup>
            )}
            {models &&
              models.length > 0 &&
              Object.entries(groupedModels).map(
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
                          value={`${model.canonicalId} ${model.params.provider} ${model.tags.join(" ")}`}
                        >
                          <div className="flex items-center">
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                value === model.uri
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">
                                {model.canonicalId}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <AIProviderIcon
                                  className="size-3 flex-shrink-0"
                                  type={model.params.provider}
                                />
                                <span>
                                  {
                                    getProviderMetadata(model.params.provider)
                                      .name
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {renderModelTags(model)}
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
