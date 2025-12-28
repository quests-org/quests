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
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

import { providerMetadataAtom } from "../atoms/provider-metadata";
import { AIProviderIcon } from "./ai-provider-icon";
import { Alert, AlertDescription } from "./ui/alert";

interface AIProviderEditDialogProps {
  config: ClientAIProviderConfig;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  open: boolean;
}

export function AIProviderEditDialog({
  config,
  onOpenChange,
  onSuccess,
  open,
}: AIProviderEditDialogProps) {
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const providerMetadata = providerMetadataMap.get(config.type);
  const [apiKey, setAPIKey] = useState("");
  const [displayName, setDisplayName] = useState(config.displayName || "");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const removeMutation = useMutation(
    rpcClient.providerConfig.remove.mutationOptions(),
  );
  const updateMutation = useMutation(
    rpcClient.providerConfig.update.mutationOptions(),
  );

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setAPIKey("");
      setDisplayName(config.displayName || "");
      setErrorMessage(null);
    }
    onOpenChange(newOpen);
  };

  const handleApiKeyChange = (value: string) => {
    setAPIKey(value);
    setErrorMessage(null);
  };

  const handleRemove = async () => {
    await removeMutation.mutateAsync(
      { id: config.id },
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
        id: config.id,
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
    handleOpenChange(false);
  };

  const hasChanges = displayName.trim() !== (config.displayName || "");

  if (!providerMetadata) {
    return null;
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AIProviderIcon type={config.type} />
            {config.displayName ?? providerMetadata.name}
          </DialogTitle>
          <DialogDescription>{providerMetadata.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="display-name">Name</Label>
              <div className="text-xs text-muted-foreground">
                Custom name to identify this provider
              </div>
            </div>
            <Input
              id="display-name"
              onChange={(e) => {
                setDisplayName(e.target.value);
                setErrorMessage(null);
              }}
              placeholder={`E.g. ${providerMetadata.name}`}
              spellCheck={false}
              type="text"
              value={displayName}
            />
          </div>

          {config.baseURL && (
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
                value={config.baseURL}
              />
            </div>
          )}
          {providerMetadata.requiresAPIKey && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="api-key">API Key</Label>
              </div>

              {config.maskedApiKey ? (
                <div className="relative">
                  <Input
                    className="pr-10 font-mono"
                    disabled
                    id="api-key"
                    readOnly
                    spellCheck={false}
                    type="text"
                    value={config.maskedApiKey}
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
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>
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
      </DialogContent>
    </Dialog>
  );
}
