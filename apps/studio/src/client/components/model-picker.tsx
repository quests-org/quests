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
import { Switch } from "@/client/components/ui/switch";
import { useHasPlan } from "@/client/hooks/use-has-plan";
import {
  getGroupedModelsEntries,
  groupAndFilterModels,
} from "@/client/lib/group-models";
import { cn } from "@/client/lib/utils";
import { rpcClient, type RPCOutput } from "@/client/rpc/client";
import {
  type AIGatewayModel,
  type AIGatewayModelURI,
} from "@quests/ai-gateway/client";
import { QuestsLogoSimpleIcon } from "@quests/components/logo-simple";
import { QUESTS_AUTO_MODEL_ID } from "@quests/shared";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AIProviderIcon } from "./ai-provider-icon";
import { ModelBadges } from "./model-badges";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ModelPickerProps {
  className?: string;
  disabled?: boolean;
  errors?: RPCOutput["gateway"]["models"]["list"]["errors"];
  isError?: boolean;
  isInvalidQuestsModel?: boolean;
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
  isInvalidQuestsModel = false,
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
  const navigate = useNavigate();
  const hasPlan = useHasPlan();

  const autoModel = useMemo(
    () => models?.find((m) => m.providerId === QUESTS_AUTO_MODEL_ID),
    [models],
  );

  const modelsWithoutAuto = useMemo(
    () => models?.filter((m) => m.providerId !== QUESTS_AUTO_MODEL_ID) ?? [],
    [models],
  );

  const groupedModels = useMemo(
    () => groupAndFilterModels({ hasPlan, models: modelsWithoutAuto }),
    [modelsWithoutAuto, hasPlan],
  );

  const hasModels = modelsWithoutAuto.length > 0;
  const hasErrors = !!errors?.length;
  const isSelectDisabled = disabled || isLoading || isError;

  const hasQuestsProviderError = useMemo(
    () => errors?.some((error) => error.config.type === "quests") ?? false,
    [errors],
  );

  const isAutoMode = selectedModel?.providerId === QUESTS_AUTO_MODEL_ID;

  const hideModelList = isAutoMode && !searchQuery;

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
      <div className="flex min-w-0 items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="shrink-0">
              {isInvalidQuestsModel ? (
                <AlertTriangle className="size-3 text-destructive" />
              ) : (
                <AIProviderIcon
                  className="size-3 opacity-90"
                  type={selectedModel.params.provider}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isInvalidQuestsModel ? (
              <p>Invalid Quests model - please use Auto mode</p>
            ) : (
              <p>{selectedModel.providerName}</p>
            )}
          </TooltipContent>
        </Tooltip>
        <span className="min-w-0 flex-1 truncate text-xs">
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
            "flex h-auto items-center justify-between px-1.5! py-1 text-left",
            !selectedModel && "text-muted-foreground",
            "max-w-full",
            className,
          )}
          disabled={isSelectDisabled}
          role="combobox"
          size="sm"
          variant="ghost"
        >
          <div className="flex w-full min-w-0 items-center text-xs">
            {getModelDisplayValue()}
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <AutoModeSwitch
            autoModel={autoModel}
            checked={isAutoMode}
            isInvalidQuestsModel={isInvalidQuestsModel}
            onCheckedChange={(checked) => {
              if (checked && autoModel) {
                onValueChange(autoModel.uri);
              } else {
                onValueChange("" as AIGatewayModelURI.Type);
              }
            }}
          />
          {autoModel && <hr className="border-t" />}
          <CommandInput
            autoFocus
            className="h-9"
            containerClassName={cn(isAutoMode && "border-b-0")}
            onValueChange={setSearchQuery}
            placeholder="Search models..."
            value={searchQuery}
          />
          <CommandList className={cn("max-h-82", hideModelList && "hidden")}>
            {!hasModels && !hasErrors ? (
              <NoProvidersMessage
                onAddProvider={() => {
                  setOpen(false);
                  onAddProvider?.();
                }}
              />
            ) : (
              <CommandEmpty>
                <NoMatchingModelsMessage
                  onAddProvider={() => {
                    setOpen(false);
                    onAddProvider?.();
                  }}
                />
              </CommandEmpty>
            )}
            {hasErrors && (
              <ErrorsGroup
                errors={errors}
                hasQuestsProviderError={hasQuestsProviderError}
              />
            )}
            {isError && (
              <CommandGroup>
                <CommandItem disabled>Failed to load models</CommandItem>
              </CommandGroup>
            )}
            {hasModels && (
              <ModelGroups
                groupedModels={groupedModels}
                hasPlan={hasPlan}
                onSelectModel={(uri, requiresPremium, modelName) => {
                  if (requiresPremium && autoModel) {
                    toast.info("Model requires paid plan", {
                      action: {
                        label: "Upgrade",
                        onClick: () => {
                          void navigate({ to: "/subscribe" });
                        },
                      },
                      description: `${modelName} is available with a paid Quests plan.`,
                      dismissible: true,
                      duration: 7000,
                      icon: (
                        <QuestsLogoSimpleIcon className="size-4 text-brand" />
                      ),
                    });
                  } else {
                    onValueChange(uri);
                  }
                  setOpen(false);
                }}
                selectedModel={selectedModel}
              />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AutoModeSwitch({
  autoModel,
  checked,
  isInvalidQuestsModel,
  onCheckedChange,
}: {
  autoModel?: AIGatewayModel.Type;
  checked: boolean;
  isInvalidQuestsModel: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const navigate = useNavigate();

  if (!autoModel) {
    return null;
  }

  if (isInvalidQuestsModel && !checked) {
    return (
      <div
        className="flex flex-col gap-2 px-4 py-3"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="flex items-start gap-1.5">
          <AlertTriangle className="mt-0.5 size-3 shrink-0 text-destructive/70" />
          <span className="text-xs text-muted-foreground">
            Your selected model is not available without a paid plan.
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onCheckedChange(true);
            }}
            size="sm"
            variant="outline"
          >
            Switch to Auto
          </Button>
          <Button
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              void navigate({ to: "/subscribe" });
            }}
            size="sm"
            variant="default"
          >
            Upgrade
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 px-4 py-3"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Auto</span>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      <span className="text-xs text-muted-foreground">
        Selects the best model for your task
      </span>
    </div>
  );
}

function ErrorsGroup({
  errors,
  hasQuestsProviderError,
}: {
  errors: NonNullable<RPCOutput["gateway"]["models"]["list"]["errors"]>;
  hasQuestsProviderError: boolean;
}) {
  return (
    <CommandGroup
      heading={
        <div className="flex w-full items-center justify-between">
          <span>Errors</span>
          <Button
            className="h-6 px-2 text-xs"
            onClick={() => {
              if (hasQuestsProviderError) {
                void rpcClient.preferences.openSettingsWindow.call({
                  tab: "General",
                });
              } else {
                void rpcClient.preferences.openSettingsWindow.call({
                  showNewProviderDialog: false,
                  tab: "Providers",
                });
              }
            }}
            size="sm"
            variant="outline"
          >
            {hasQuestsProviderError ? "Check account" : "Edit providers"}
          </Button>
        </div>
      }
    >
      {errors.map((error) => (
        <CommandItem
          className="flex cursor-default items-center py-2 data-disabled:opacity-80!"
          disabled
          key={error.config.id}
        >
          <AlertCircle className="mr-2 size-4 shrink-0 text-destructive" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-1 text-xs">
              <AIProviderIcon
                className="size-3 shrink-0"
                type={error.config.type}
              />
              <span className="text-muted-foreground">
                {error.config.displayName}
              </span>
            </div>
            <span className="line-clamp-2 text-xs wrap-break-word">
              {error.message}
            </span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function ModelGroups({
  groupedModels,
  hasPlan,
  onSelectModel,
  selectedModel,
}: {
  groupedModels: ReturnType<typeof groupAndFilterModels>;
  hasPlan: boolean;
  onSelectModel: (
    uri: AIGatewayModelURI.Type,
    requiresPremium: boolean,
    modelName: string,
  ) => void;
  selectedModel?: AIGatewayModel.Type;
}) {
  return (
    <>
      {getGroupedModelsEntries(groupedModels).map(
        ([groupName, modelGroup]) =>
          modelGroup.length > 0 && (
            <CommandGroup heading={groupName} key={groupName}>
              {modelGroup.map((model) => {
                const requiresPremium =
                  model.tags.includes("premium") && !hasPlan;

                return (
                  <CommandItem
                    className="flex items-center justify-between py-2"
                    key={model.uri}
                    onSelect={() => {
                      onSelectModel(model.uri, requiresPremium, model.name);
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
                    <div className="mt-1 ml-2 flex gap-1 self-start">
                      <ModelBadges hasPlan={hasPlan} model={model} />
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ),
      )}
    </>
  );
}

function NoMatchingModelsMessage({
  onAddProvider,
}: {
  onAddProvider: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-sm text-muted-foreground">No matching models</p>
      <Button onClick={onAddProvider} size="sm" variant="outline">
        <Plus className="mr-2 size-4" />
        Add an AI provider
      </Button>
      <p className="max-w-64 text-center text-xs text-muted-foreground">
        The model you&apos;re looking for might be available from a different
        provider
      </p>
    </div>
  );
}

function NoProvidersMessage({ onAddProvider }: { onAddProvider: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-sm text-muted-foreground">
        Connect a provider to use Quests
      </p>
      <Button onClick={onAddProvider} size="sm" variant="outline">
        <Plus className="mr-2 size-4" />
        Add an AI provider
      </Button>
    </div>
  );
}
