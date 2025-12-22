import { AddProviderDialog } from "@/client/components/add-provider/dialog";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";

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
  const { signIn } = useSignInSocial();

  const { data: providerConfigs } = useQuery(
    rpcClient.providerConfig.live.list.experimental_liveOptions(),
  );

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void signIn();
  };

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
            <form
              className="flex w-full items-center justify-center"
              onSubmit={handleSignIn}
            >
              <Button className="w-full" type="submit" variant="default">
                <SiGoogle />
                Continue with Google
              </Button>
            </form>

            <div className="flex flex-col items-center justify-center">
              <div className="text-sm text-muted-foreground/50">or</div>
              <Button
                className="text-muted-foreground/80"
                onClick={() => {
                  setShowAddProviderDialog(true);
                }}
                type="button"
                variant="ghost"
              >
                Add an AI provider manually
              </Button>
            </div>
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

          <p className="max-w-xs text-center text-xs text-muted-foreground/50">
            By clicking continue, you agree to our{" "}
            <a
              className="underline"
              href="https://quests.dev/terms"
              rel="noopener noreferrer"
              target="_blank"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              className="underline"
              href="https://quests.dev/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
