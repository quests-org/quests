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
import { getProviderMetadata } from "@/client/lib/provider-metadata";
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

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
  const providerMetadata = getProviderMetadata(provider.type);
  const [apiKey, setAPIKey] = useState("");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);

  const removeMutation = useMutation(
    rpcClient.provider.remove.mutationOptions(),
  );

  useEffect(() => {
    if (open) {
      setAPIKey("");
      setErrorMessage(null);
    }
  }, [open]);

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

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AIProviderIcon type={provider.type} />
            {providerMetadata.name}
          </DialogTitle>
          <DialogDescription>{providerMetadata.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
                  placeholder={`${providerMetadata.apiKeyFormat ?? ""}...xyz123`}
                  spellCheck={false}
                  type="text"
                  value={apiKey}
                />
              )}
            </div>
          )}
          {!providerMetadata.requiresAPIKey && (
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
            disabled={removeMutation.isPending}
            onClick={handleRemove}
            variant="destructive"
          >
            {removeMutation.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
