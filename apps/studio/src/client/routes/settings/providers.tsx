import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AddProviderDialog } from "@/client/components/add-provider/dialog";
import { AIProviderEditDialog } from "@/client/components/ai-provider-edit-dialog";
import { ProviderConfigListItem } from "@/client/components/provider-config-list-item";
import { Button } from "@/client/components/ui/button";
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const ProvidersSearchSchema = z.object({
  showNewProviderDialog: z.boolean().optional(),
});

export const Route = createFileRoute("/settings/providers")({
  component: SettingsProvidersPage,
  validateSearch: ProvidersSearchSchema,
});

function SettingsProvidersPage() {
  const { data: providerConfigs } = useQuery(
    rpcClient.providerConfig.live.list.experimental_liveOptions(),
  );
  const { showNewProviderDialog } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);

  const [selectedConfig, setSelectedConfig] =
    useState<ClientAIProviderConfig | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">AI Providers</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect providers to access different models and services.
          </p>
        </div>
        <Button
          onClick={() => {
            void navigate({ search: { showNewProviderDialog: true } });
          }}
          size="sm"
        >
          <Plus className="size-4" />
          Add Provider
        </Button>
      </div>

      <div className="space-y-3">
        {providerConfigs?.length === 0 ? (
          <div className="mt-32 py-8 text-center text-muted-foreground">
            <p className="text-sm">No providers configured yet.</p>
          </div>
        ) : (
          providerConfigs?.map((config) => (
            <ProviderConfigListItem
              config={config}
              key={config.id}
              metadata={providerMetadataMap.get(config.type)}
              onConfigure={() => {
                setSelectedConfig(config);
              }}
            />
          ))
        )}
      </div>

      {selectedConfig && (
        <AIProviderEditDialog
          config={selectedConfig}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedConfig(null);
            }
          }}
          onSuccess={() => {
            setSelectedConfig(null);
          }}
          open={Boolean(selectedConfig)}
        />
      )}

      {showNewProviderDialog && (
        <AddProviderDialog
          onOpenChange={(open) => {
            if (!open) {
              void navigate({ search: {} });
            }
          }}
          onSuccess={() => {
            void navigate({ search: {} });
          }}
          open={showNewProviderDialog}
          providers={providerConfigs ?? []}
        />
      )}
    </div>
  );
}
