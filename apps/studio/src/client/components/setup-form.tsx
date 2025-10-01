import { AddProviderDialog } from "@/client/components/add-provider-dialog";
import { SupportedProviders } from "@/client/components/supported-providers";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SetupForm() {
  const navigate = useNavigate();
  const { data: providers } = useQuery(
    rpcClient.provider.live.list.experimental_liveOptions(),
  );
  const hasProvider = (providers?.length ?? 0) > 0;
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);

  return (
    <div className={cn("flex flex-col gap-6 pb-12")}>
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md">
            {hasProvider ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand">
                <Check className="h-6 w-6 text-brand-foreground" />
              </div>
            ) : (
              <QuestsAnimatedLogo size={64} />
            )}
          </div>
          <h1 className="text-3xl font-bold">
            {hasProvider ? "Setup complete!" : "Configure an AI provider"}
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-md text-balance">
            {hasProvider
              ? "You can now start creating with Quests."
              : "Add an AI provider to get started. API keys are encrypted and stored locally."}
          </p>
        </div>

        {hasProvider ? (
          <Button
            className="w-full min-w-80"
            onClick={() => void navigate({ to: "/welcome" })}
            variant="default"
          >
            Next
          </Button>
        ) : (
          <div className="flex flex-col gap-6 w-full min-w-80">
            <Button
              className="w-full"
              onClick={() => {
                setShowAddProviderDialog(true);
              }}
              variant="default"
            >
              Add an AI provider
            </Button>
            <SupportedProviders />
          </div>
        )}
      </div>

      <AddProviderDialog
        onOpenChange={setShowAddProviderDialog}
        onSuccess={() => {
          setShowAddProviderDialog(false);
          toast.success("Provider added successfully");
          void navigate({ to: "/welcome" });
        }}
        open={showAddProviderDialog}
        providers={providers ?? []}
      />
    </div>
  );
}
