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
import { cn } from "@/client/lib/utils";
import { type AIGatewayModel } from "@quests/ai-gateway";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronsUpDown, CircleOff } from "lucide-react";
import { fork } from "radashi";
import { useState } from "react";

import { rpcClient, vanillaRpcClient } from "../rpc/client";

interface ModelPickerProps {
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
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
    Recommended: recommended,
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
  onBlur,
  onFocus,
  onValueChange,
  placeholder = "Select a model",
  value,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const { data, isError, isLoading } = useQuery(
    rpcClient.gateway.models.live.list.experimental_liveOptions(),
  );
  const { errors, models } = data ?? {};

  const selectedModel = models?.find((model) => model.uri === value);

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
      <div className="flex items-center justify-between w-full">
        <span className="truncate">{selectedModel.canonicalId}</span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {selectedModel.tags.includes("legacy") && (
            <Badge className="text-xs px-1 py-0" variant="outline">
              legacy
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {selectedModel.params.provider}
          </span>
        </div>
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

  if (models && models.length === 0) {
    return (
      <Button
        disabled={disabled}
        onBlur={onBlur}
        onClick={() => {
          void vanillaRpcClient.preferences.openSettingsWindow({
            showNewProviderDialog: true,
            tab: "Providers",
          });
        }}
        onFocus={onFocus}
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
          className={cn(!selectedModel && "text-muted-foreground", className)}
          disabled={isSelectDisabled}
          onBlur={() => {
            if (!open) {
              onBlur?.();
            }
          }}
          onFocus={onFocus}
          role="combobox"
          size="sm"
          variant="outline"
        >
          {getModelDisplayValue()}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput className="h-9" placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            {errors && errors.length > 0 && (
              <CommandGroup heading="Errors">
                {errors.map((error, index) => (
                  <CommandItem
                    className="flex items-center py-2 text-destructive cursor-default"
                    disabled
                    key={index}
                  >
                    <AlertCircle className="mr-2 size-4 shrink-0" />
                    <span className="text-sm">{error}</span>
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
              Object.entries(groupAndFilterModels(models)).map(
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
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {model.canonicalId}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {model.params.provider}
                              </span>
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
