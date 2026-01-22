import { AddProviderDialog } from "@/client/components/add-provider/dialog";
import { GoogleSignInButton } from "@/client/components/google-sign-in-button";
import { ManualProviderButton } from "@/client/components/manual-provider-button";
import { TermsFooter } from "@/client/components/terms-footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function AIProviderGuardDialog({
  description,
  onOpenChange,
  open,
}: {
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);

  const { data: providerConfigs } = useQuery(
    rpcClient.providerConfig.live.list.experimental_liveOptions(),
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Add an AI provider to continue</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-md">
              <QuestsAnimatedLogo size={64} />
            </div>
            <h2 className="text-center text-2xl font-bold">
              Add an AI provider
            </h2>
            <p className="max-w-sm text-center text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-4">
            <GoogleSignInButton className="w-full" />

            <ManualProviderButton
              onClick={() => {
                setShowAddProviderDialog(true);
              }}
            />
          </div>

          <AddProviderDialog
            onOpenChange={setShowAddProviderDialog}
            onSuccess={() => {
              setShowAddProviderDialog(false);
              onOpenChange(false);
            }}
            open={showAddProviderDialog}
            providers={providerConfigs ?? []}
          />

          <TermsFooter className="max-w-xs text-center text-xs text-muted-foreground/50" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
