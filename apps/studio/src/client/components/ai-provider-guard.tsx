import { AddProviderDialog } from "@/client/components/add-provider/dialog";
import { Button } from "@/client/components/ui/button";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";
import { toast } from "sonner";

export function AIProviderGuard({
  description,
  onClose,
}: {
  description: string;
  onClose?: () => void;
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
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-md">
          <QuestsAnimatedLogo size={64} />
        </div>
        <h2 className="text-2xl font-bold text-center">Add an AI provider</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <form
          className="flex items-center justify-center w-full"
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
          toast.success("Provider added successfully");
          onClose?.();
        }}
        open={showAddProviderDialog}
        providers={providerConfigs ?? []}
      />

      <p className="text-xs text-muted-foreground/50 text-center max-w-xs">
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
  );
}
