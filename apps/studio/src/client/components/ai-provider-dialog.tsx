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
import { Alert, AlertDescription } from "./ui/alert";

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
  const [apiKey, setAPIKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const createMutation = useMutation(
    rpcClient.provider.create.mutationOptions(),
  );
  const removeMutation = useMutation(
    rpcClient.provider.remove.mutationOptions(),
  );

  const isCreatingNew = provider === null;

  const typeError =
    selectedProviderType && isCreatingNew
      ? providers.some((p) => p.type === selectedProviderType)
        ? "A provider of this type already exists."
        : null
      : null;

  useEffect(() => {
    if (open) {
      setAPIKey("");
      setErrorMessage(null);
      setSelectedProviderType(provider?.type);
    }
  }, [open, provider]);

  const handleProviderTypeChange = (type: AIGatewayProvider.Type["type"]) => {
    setSelectedProviderType(type);
    setErrorMessage(null);
  };

  const handleApiKeyChange = (value: string) => {
    setAPIKey(value);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (
      !selectedProviderType ||
      typeError ||
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
  };

  const handleRemove = async () => {
    if (!provider?.id) {
      return;
    }

    await removeMutation.mutateAsync(
      { id: provider.id },
      {
        onError: () => {
          setErrorMessage("Failed to remove provider");
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
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertDescription>{typeError}</AlertDescription>
                </Alert>
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
                  value={apiKey}
                />
              )}
            </div>
          )}
          {!isCreatingNew && !providerMetadata?.requiresAPIKey && (
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
          {isCreatingNew ? (
            <Button
              disabled={
                createMutation.isPending ||
                !selectedProviderType ||
                (providerMetadata?.requiresAPIKey && !apiKey) ||
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
