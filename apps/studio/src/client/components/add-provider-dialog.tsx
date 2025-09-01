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
} from "@/client/lib/provider-metadata";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { isDefinedError } from "@orpc/client";
import { type AIGatewayProvider } from "@quests/ai-gateway";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { selectedModelURIAtom } from "../atoms/selected-models";
import { AIProviderIcon } from "./ai-provider-icon";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";

interface AddProviderDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
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
        onSuccess: () => {
          onSuccess?.();
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
  };

  const handleClose = () => {
    onOpenChange(false);
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
        <div className="grid grid-cols-2 gap-3">
          {ALL_PROVIDERS.map((providerInfo) => {
            const isAlreadyAdded = providers.some(
              (p) => p.type === providerInfo.type,
            );
            return (
              <button
                className={`p-3 rounded-lg border text-left transition-colors flex flex-col gap-2 ${
                  isAlreadyAdded
                    ? "border-muted bg-muted/50 cursor-not-allowed opacity-60"
                    : "border-border hover:border-ring hover:bg-accent cursor-pointer"
                }`}
                disabled={isAlreadyAdded}
                key={providerInfo.type}
                onClick={() => {
                  if (!isAlreadyAdded) {
                    handleProviderSelect(providerInfo.type);
                  }
                }}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <AIProviderIcon type={providerInfo.type} />
                  <div className="font-medium">{providerInfo.name}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {providerInfo.description}
                </div>
                {providerInfo.tags.length > 0 && !isAlreadyAdded && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {providerInfo.tags.map((tag) => (
                      <Badge key={tag} variant="brand-outline">
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
      <DialogFooter>
        <Button
          autoFocus // To avoid focusing the first provider
          onClick={handleClose}
          type="button"
          variant="secondary"
        >
          Cancel
        </Button>
      </DialogFooter>
    </>
  );

  const renderConfiguration = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button
            className="h-6 w-6 p-0"
            onClick={handleBackToSelection}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {providerMetadata
            ? `Configure ${providerMetadata.name}`
            : "Configure Provider"}
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
        <Button onClick={handleClose} type="button" variant="secondary">
          Cancel
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
      <DialogContent className="sm:max-w-lg">
        {stage === "provider-selection"
          ? renderProviderSelection()
          : renderConfiguration()}
      </DialogContent>
    </Dialog>
  );
}
