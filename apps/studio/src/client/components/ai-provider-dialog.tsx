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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  ALL_PROVIDERS,
  getProviderMetadata,
} from "@/client/lib/provider-metadata";
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { isDefinedError } from "@orpc/client";
import { type AIGatewayProvider } from "@quests/ai-gateway";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { AIProviderIcon } from "./ai-provider-icon";

interface AIProviderDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
  provider: ClientAIProvider | null;
  providers?: ClientAIProvider[];
}

export function AIProviderDialog({
  onOpenChange,
  onSuccess,
  open,
  provider,
  providers = [],
}: AIProviderDialogProps) {
  const [selectedProviderType, setSelectedProviderType] = useState<
    AIGatewayProvider.Type["type"] | undefined
  >(provider?.type);
  const providerMetadata = selectedProviderType
    ? getProviderMetadata(selectedProviderType)
    : undefined;
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [typeError, setTypeError] = useState<null | string>(null);
  const [apiKeyError, setApiKeyError] = useState<null | string>(null);
  const [generalError, setGeneralError] = useState<null | string>(null);

  const createMutation = useMutation(
    rpcClient.provider.create.mutationOptions(),
  );
  const removeMutation = useMutation(
    rpcClient.provider.remove.mutationOptions(),
  );

  const isCreatingNew = provider === null;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setApiKeyValue("");
      setTypeError(null);
      setApiKeyError(null);
      setGeneralError(null);
      setSelectedProviderType(provider?.type);
    }
  }, [open, provider]);

  const handleProviderTypeChange = (type: AIGatewayProvider.Type["type"]) => {
    setSelectedProviderType(type);
    setTypeError(null);

    // Check if this provider type already exists
    const existingProvider = providers.find((p) => p.type === type);
    if (existingProvider) {
      setTypeError("A provider of this type already exists.");
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeyValue(value);
    setApiKeyError(null);
    setGeneralError(null);
  };

  const handleSave = async () => {
    if (
      !selectedProviderType ||
      typeError ||
      (providerMetadata?.requiresAPIKey && !apiKeyValue)
    ) {
      return;
    }

    await createMutation.mutateAsync(
      {
        apiKey: providerMetadata?.requiresAPIKey ? apiKeyValue : "NOT_NEEDED",
        type: selectedProviderType,
      },
      {
        onError: (error) => {
          if (isDefinedError(error)) {
            setApiKeyError("Invalid API key");
          } else {
            setGeneralError("Failed to save provider");
          }
        },
        onSuccess: () => {
          onSuccess?.();
        },
      },
    );
  };

  const handleRemove = async () => {
    if (!provider?.id) {
      return;
    }

    await removeMutation.mutateAsync(
      { id: provider.id },
      {
        onError: () => {
          setGeneralError("Failed to remove provider");
        },
        onSuccess: () => {
          onSuccess?.();
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isCreatingNew
              ? "Add Provider"
              : providerMetadata
                ? `Configure ${providerMetadata.name}`
                : "Configure Provider"}
          </DialogTitle>
          <DialogDescription>
            {isCreatingNew
              ? "Select a provider type to add a new provider."
              : selectedProviderType
                ? getProviderMetadata(selectedProviderType).description
                : "Configure your provider settings."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {generalError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{generalError}</span>
            </div>
          )}
          {isCreatingNew && (
            <div className="space-y-2">
              <Label htmlFor="provider-type">Provider Type</Label>
              <Select
                onValueChange={handleProviderTypeChange}
                value={selectedProviderType || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PROVIDERS.map(({ name, type }) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <AIProviderIcon type={type} />
                        <span>{name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{typeError}</span>
                </div>
              )}
              {selectedProviderType && providerMetadata && (
                <div className="text-sm text-muted-foreground">
                  {providerMetadata.description}
                </div>
              )}
            </div>
          )}

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

              {!isCreatingNew && provider.maskedApiKey ? (
                <div className="relative">
                  <Input
                    className="font-mono pr-10"
                    disabled
                    id="api-key"
                    readOnly
                    spellCheck={false}
                    type="text"
                    value={provider.maskedApiKey}
                  />
                </div>
              ) : (
                <Input
                  className="font-mono"
                  id="api-key"
                  onChange={(e) => {
                    handleApiKeyChange(e.target.value);
                  }}
                  placeholder={`${providerMetadata.apiKeyFormat ?? ""}...xyz123`}
                  spellCheck={false}
                  type="text"
                  value={apiKeyValue}
                />
              )}

              {apiKeyError && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{apiKeyError}</span>
                </div>
              )}
            </div>
          )}
          {!isCreatingNew && !providerMetadata?.requiresAPIKey && (
            <div className="rounded-lg border bg-muted p-4 text-center text-sm text-muted-foreground">
              No additional configuration required for this provider.
            </div>
          )}
        </div>
        <DialogFooter className="flex gap-2">
          <Button onClick={handleClose} type="button" variant="secondary">
            Cancel
          </Button>
          {isCreatingNew ? (
            <Button
              disabled={
                createMutation.isPending ||
                !selectedProviderType ||
                (providerMetadata?.requiresAPIKey && !apiKeyValue) ||
                Boolean(typeError)
              }
              onClick={handleSave}
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          ) : (
            <Button
              disabled={removeMutation.isPending}
              onClick={handleRemove}
              variant="destructive"
            >
              {removeMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
