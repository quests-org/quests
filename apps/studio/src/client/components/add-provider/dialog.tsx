import { Dialog, DialogContent } from "@/client/components/ui/dialog";
import { fixURL } from "@/client/lib/fix-url";
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { isDefinedError } from "@orpc/client";
import { AI_GATEWAY_API_KEY_NOT_NEEDED } from "@quests/shared";
import { useMutation } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { providerMetadataAtom } from "../../atoms/provider-metadata";
import { ProviderConfigScreen } from "./provider-config-screen";

export function AddProviderDialog({
  onOpenChange,
  onSuccess,
  open,
  providers = [],
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  providers?: ClientAIProviderConfig[];
}) {
  const [state, dispatch] = useAtom(addProviderDialogAtom);
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);

  const createMutation = useMutation(
    rpcClient.providerConfig.create.mutationOptions(),
  );

  useEffect(() => {
    if (open) {
      dispatch({ type: "RESET" });
    }
  }, [open, dispatch]);

  const handleSave = async (skipValidation = false) => {
    if (!state.selectedProviderType) {
      return;
    }

    const providerMetadata = providerMetadataMap.get(
      state.selectedProviderType,
    );
    const requiresAPIKey = providerMetadata?.requiresAPIKey ?? true;
    const defaultBaseURL = providerMetadata?.api.defaultBaseURL ?? "";

    let baseURLToSave: string | undefined;

    if (state.baseURL.trim()) {
      const normalizedBaseURL = fixURL(state.baseURL);
      if (normalizedBaseURL !== state.baseURL) {
        dispatch({
          type: "SET_BASE_URL",
          value: normalizedBaseURL,
        });
      }
      // Only save the base URL if the user modified it from the default.
      // This allows us to update defaults in the future without affecting
      // existing configurations.
      if (normalizedBaseURL !== defaultBaseURL) {
        baseURLToSave = normalizedBaseURL;
      }
    }

    try {
      await createMutation.mutateAsync(
        {
          config: {
            apiKey: requiresAPIKey
              ? state.apiKey
              : AI_GATEWAY_API_KEY_NOT_NEEDED,
            baseURL: baseURLToSave,
            displayName: state.displayName.trim() || undefined,
            type: state.selectedProviderType,
          },
          skipValidation,
        },
        {
          onError: (error) => {
            if (isDefinedError(error)) {
              const isBadRequest = error.code === "BAD_REQUEST";
              dispatch({
                allowBypass: !isBadRequest,
                message: error.message,
                type: "SET_ERROR",
                validationFailed: true,
              });
            } else {
              dispatch({
                allowBypass: false,
                message: "Failed to validate provider",
                type: "SET_ERROR",
                validationFailed: true,
              });
            }
          },
        },
      );
      onSuccess();
    } catch {
      // Handled in onError
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="transition-none sm:max-w-lg">
        <ProviderConfigScreen
          onSave={handleSave}
          providers={providers}
          saving={createMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
