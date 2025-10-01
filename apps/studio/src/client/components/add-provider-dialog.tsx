import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  ALL_PROVIDERS,
  getProviderMetadata,
  RECOMMENDED_TAG,
  SORTED_PROVIDERS,
} from "@/client/lib/provider-metadata";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { isDefinedError } from "@orpc/client";
import { type AIGatewayProvider } from "@quests/ai-gateway";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { AlertCircle, Award, ChefHat, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { selectedModelURIAtom } from "../atoms/selected-models";
import { AIProviderIcon } from "./ai-provider-icon";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";

interface AddProviderDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  providers?: ClientAIProvider[];
}

type DialogStage = "configuration" | "provider-selection";

export function AddProviderDialog({
  onOpenChange,
  onSuccess,
  open,
  providers = [],
}: AddProviderDialogProps) {
  const [selectedModelURI, setSelectedModelURI] = useAtom(selectedModelURIAtom);
  const [stage, setStage] = useState<DialogStage>("provider-selection");
  const [selectedProviderType, setSelectedProviderType] = useState<
    AIGatewayProvider.Type["type"] | undefined
  >(undefined);
  const providerMetadata = selectedProviderType
    ? getProviderMetadata(selectedProviderType)
    : undefined;
  const [apiKey, setAPIKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const createMutation = useMutation(
    rpcClient.provider.create.mutationOptions(),
  );

  useEffect(() => {
    if (open) {
      setAPIKey("");
      setErrorMessage(null);
      setSelectedProviderType(undefined);
      setStage("provider-selection");
    }
  }, [open]);

  const handleProviderSelect = (type: AIGatewayProvider.Type["type"]) => {
    setSelectedProviderType(type);
    setErrorMessage(null);
    setStage("configuration");
  };

  const handleBackToSelection = () => {
    setStage("provider-selection");
    setSelectedProviderType(undefined);
    setErrorMessage(null);
  };

  const handleApiKeyChange = (value: string) => {
    setAPIKey(value);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (
      !selectedProviderType ||
      (providerMetadata?.requiresAPIKey && !apiKey)
    ) {
      return;
    }

    try {
      await createMutation.mutateAsync(
        {
          apiKey: providerMetadata?.requiresAPIKey ? apiKey : "NOT_NEEDED",
          type: selectedProviderType,
        },
        {
          onError: (error) => {
            if (isDefinedError(error)) {
              setErrorMessage(error.message);
            } else {
              setErrorMessage("Failed to validate provider");
            }
          },
        },
      );
      if (providers.length === 0 || !selectedModelURI) {
        const { models } = await vanillaRpcClient.gateway.models.list();
        const defaultModel = models.find((model) =>
          model.tags.includes("default"),
        );
        if (defaultModel) {
          setSelectedModelURI(defaultModel.uri);
        }
      }
      onSuccess();
    } catch {
      // Handled in onError, but caught here to avoid uncaught promise error
    }
  };

  const renderProviderSelection = () => (
    <>
      <DialogHeader>
        <DialogTitle>Add Provider</DialogTitle>
        <DialogDescription>
          Choose a provider type to add a new AI provider.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        {providers.length === ALL_PROVIDERS.length && (
          <Alert className="mb-4">
            <ChefHat className="size-4 animate-bounce" />
            <AlertDescription>
              Wow, you added all of the providers. It&apos;s time to get
              cooking.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-3">
          {SORTED_PROVIDERS.map((providerInfo) => {
            const isAlreadyAdded = providers.some(
              (p) => p.type === providerInfo.type,
            );
            return (
              <button
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors flex flex-col gap-2 min-h-34",
                  isAlreadyAdded
                    ? "border-muted bg-muted/50 cursor-not-allowed opacity-60"
                    : "border-border hover:border-ring hover:bg-accent cursor-pointer",
                )}
                disabled={isAlreadyAdded}
                key={providerInfo.type}
                onClick={() => {
                  if (!isAlreadyAdded) {
                    handleProviderSelect(providerInfo.type);
                  }
                }}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <AIProviderIcon
                    className="opacity-80 size-4.5"
                    type={providerInfo.type}
                  />
                  <div className="font-medium">{providerInfo.name}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {providerInfo.description}
                </div>
                {providerInfo.tags.length > 0 && !isAlreadyAdded && (
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {providerInfo.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={
                          tag === RECOMMENDED_TAG ? "brand-outline" : "outline"
                        }
                      >
                        {tag === RECOMMENDED_TAG && (
                          <Award className="size-3" />
                        )}
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {isAlreadyAdded && (
                  <div className="text-xs text-muted-foreground">
                    Already added
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  const renderConfiguration = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {selectedProviderType && (
            <AIProviderIcon type={selectedProviderType} />
          )}
          {providerMetadata?.name ?? "Provider"}
        </DialogTitle>
        <DialogDescription>
          {selectedProviderType
            ? getProviderMetadata(selectedProviderType).description
            : "Configure your provider settings."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        {selectedProviderType && providerMetadata?.requiresAPIKey && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <a
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                  href={providerMetadata.apiKeyURL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Get your API key
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span>or</span>
                <a
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                  href={providerMetadata.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  learn more
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <Input
              autoFocus
              className="font-mono"
              id="api-key"
              onChange={(e) => {
                handleApiKeyChange(e.target.value);
              }}
              placeholder={`${providerMetadata.apiKeyFormat ?? ""}...xyz123`}
              spellCheck={false}
              type="text"
              value={apiKey}
            />
          </div>
        )}
        {selectedProviderType && !providerMetadata?.requiresAPIKey && (
          <Alert>
            <AlertDescription className="text-center">
              No additional configuration required for this provider.
            </AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </div>
      <DialogFooter className="flex gap-2">
        <Button
          onClick={handleBackToSelection}
          type="button"
          variant="secondary"
        >
          Back
        </Button>
        <Button
          disabled={
            createMutation.isPending ||
            !selectedProviderType ||
            (providerMetadata?.requiresAPIKey && !apiKey)
          }
          onClick={handleSave}
        >
          {createMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-xl">
        {stage === "provider-selection"
          ? renderProviderSelection()
          : renderConfiguration()}
      </DialogContent>
    </Dialog>
  );
}
