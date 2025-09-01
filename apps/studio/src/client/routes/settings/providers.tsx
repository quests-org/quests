import { AddProviderDialog } from "@/client/components/add-provider-dialog";
import { AIProviderEditDialog } from "@/client/components/ai-provider-edit-dialog";
import { ProviderListItem } from "@/client/components/provider-list-item";
import { Button } from "@/client/components/ui/button";
import { rpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
  const { data: providers } = useQuery(
    rpcClient.provider.live.list.experimental_liveOptions(),
  );
  const { showNewProviderDialog } = Route.useSearch();
  const navigate = Route.useNavigate();

  const [selectedProvider, setSelectedProvider] =
    useState<ClientAIProvider | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">AI Providers</h3>
          <p className="text-sm text-muted-foreground mt-1">
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
        {providers?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground mt-32">
            <p className="text-sm">No providers configured yet.</p>
          </div>
        ) : (
          providers?.map((provider) => (
            <ProviderListItem
              key={provider.id}
              onConfigure={() => {
                setSelectedProvider(provider);
              }}
              provider={provider}
            />
          ))
        )}
      </div>

      {selectedProvider && (
        <AIProviderEditDialog
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProvider(null);
            }
          }}
          onSuccess={() => {
            setSelectedProvider(null);
          }}
          open={Boolean(selectedProvider)}
          provider={selectedProvider}
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
          providers={providers ?? []}
        />
      )}
    </div>
  );
}
