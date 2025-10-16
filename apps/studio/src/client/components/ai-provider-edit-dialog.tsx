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
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { providerMetadataAtom } from "../atoms/provider-metadata";
import { AIProviderIcon } from "./ai-provider-icon";
import { Alert, AlertDescription } from "./ui/alert";

interface AIProviderEditDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
  provider: ClientAIProvider;
}

export function AIProviderEditDialog({
  onOpenChange,
  onSuccess,
  open,
  provider,
}: AIProviderEditDialogProps) {
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const providerMetadata = providerMetadataMap.get(provider.type);
  const [apiKey, setAPIKey] = useState("");
  const [displayName, setDisplayName] = useState(provider.displayName || "");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const removeMutation = useMutation(
    rpcClient.provider.remove.mutationOptions(),
  );
  const updateMutation = useMutation(
    rpcClient.provider.update.mutationOptions(),
  );

  useEffect(() => {
    if (open) {
      setAPIKey("");
      setDisplayName(provider.displayName || "");
      setErrorMessage(null);
    }
  }, [open, provider.displayName]);

  const handleApiKeyChange = (value: string) => {
    setAPIKey(value);
    setErrorMessage(null);
  };

  const handleRemove = async () => {
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

  const handleSave = async () => {
    await updateMutation.mutateAsync(
      {
        displayName: displayName.trim() || undefined,
        id: provider.id,
      },
      {
        onError: () => {
          setErrorMessage("Failed to update provider");
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

  const hasChanges =
    provider.type === "openai-compatible" &&
    displayName.trim() !== (provider.displayName || "");

  if (!providerMetadata) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AIProviderIcon type={provider.type} />
            {provider.displayName ?? providerMetadata.name}
          </DialogTitle>
          <DialogDescription>{providerMetadata.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {provider.type === "openai-compatible" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="display-name">Name</Label>
              </div>
              <Input
                id="display-name"
                onChange={(e) => {
                  setDisplayName(e.target.value);
                }}
                placeholder="E.g. My Custom Provider"
                spellCheck={false}
                type="text"
                value={displayName}
              />
            </div>
          )}

          {provider.type === "openai-compatible" && provider.baseURL && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="base-url">Base URL</Label>
              </div>
              <Input
                className="font-mono"
                disabled
                id="base-url"
                readOnly
                spellCheck={false}
                type="text"
                value={provider.baseURL}
              />
            </div>
          )}
          {providerMetadata.requiresAPIKey && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="api-key">API Key</Label>
              </div>

              {provider.maskedApiKey ? (
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
                  placeholder={`${providerMetadata.api.keyFormat ?? ""}...xyz123`}
                  spellCheck={false}
                  type="text"
                  value={apiKey}
                />
              )}
            </div>
          )}
          {!providerMetadata.requiresAPIKey &&
            provider.type !== "openai-compatible" && (
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
        {provider.type === "openai-compatible" ? (
          <DialogFooter className="flex items-center">
            <Button
              disabled={removeMutation.isPending || updateMutation.isPending}
              onClick={handleRemove}
              variant="ghost-destructive"
            >
              {removeMutation.isPending ? "Removing..." : "Remove"}
            </Button>
            <div className="flex-1" />
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={
                !hasChanges ||
                updateMutation.isPending ||
                removeMutation.isPending
              }
              onClick={handleSave}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="flex gap-2">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              disabled={removeMutation.isPending || updateMutation.isPending}
              onClick={handleRemove}
              variant="destructive"
            >
              {removeMutation.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
