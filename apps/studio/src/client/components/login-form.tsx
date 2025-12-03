import Particles from "@/client/components/particles";
import { Button } from "@/client/components/ui/button";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type RPCError } from "@/electron-main/lib/errors";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function LoginForm({
  modal = false,
  onClose,
}: {
  modal?: boolean;
  onClose?: () => void;
}) {
  const [error, setError] = useState<null | RPCError>(null);
  const { signIn } = useSignInSocial();
  const { mutate: removeTab } = useMutation(
    rpcClient.tabs.close.mutationOptions(),
  );

  const { data: authSessionChanged, isFetched } = useQuery(
    rpcClient.user.live.me.experimental_liveOptions({}),
  );

  useEffect(() => {
    if (authSessionChanged?.error) {
      setError(authSessionChanged.error);
    } else if (authSessionChanged && isFetched) {
      onClose?.();
      // TODO: fan this out, show signed in temp in all tabs
      toast.dismiss();

      if (!modal && window.api.tabId) {
        removeTab({ id: window.api.tabId });
      }
    }
  }, [authSessionChanged, isFetched, modal, onClose, removeTab]);

  const handleContinueClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void signIn();
  };

  return (
    <div className="flex min-h-svh flex-col bg-background overflow-y-auto">
      <div className="relative z-10 w-full flex flex-1 justify-center items-center">
        <div className={cn("flex flex-col gap-6")}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2">
              <a
                className="flex flex-col items-center gap-2 font-medium"
                href="#"
              >
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-md">
                  <QuestsAnimatedLogo size={64} />
                </div>
                <span className="sr-only">Quests</span>
              </a>
              <h1 className="text-3xl font-bold mb-2">Sign in to Quests</h1>
              {error && (
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  There was an error signing in.
                </p>
              )}
              {!error && (
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Continue with Google to sign in or create an account.
                </p>
              )}
              {modal && !error && (
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  You need to be signed in to use Quests AI features.
                </p>
              )}
            </div>

            {!error && (
              <div className="flex flex-col items-center justify-center gap-3">
                <form
                  className="flex items-center justify-center gap-3 relative"
                  onSubmit={handleContinueClick}
                >
                  <Button
                    className="w-full min-w-80"
                    type="submit"
                    variant="default"
                  >
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </form>

                <div className="text-sm text-muted-foreground/70">or</div>

                <div className="flex items-center justify-center gap-3 relative">
                  <Button
                    className="w-full min-w-80 text-foreground/70"
                    onClick={() => {
                      void vanillaRpcClient.preferences.openSettingsWindow({
                        showNewProviderDialog: true,
                        tab: "Providers",
                      });
                      onClose?.();
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Add an AI provider manually
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="relative z-10 pb-6 text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        By clicking continue, you agree to our{" "}
        <a
          href="https://quests.dev/terms"
          rel="noopener noreferrer"
          target="_blank"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="https://quests.dev/privacy"
          rel="noopener noreferrer"
          target="_blank"
        >
          Privacy Policy
        </a>
        .
      </div>
      <Particles
        color="#155ADE"
        color2="#F7FF9B"
        disableMouseMovement
        ease={80}
        quantityDesktop={350}
        quantityMobile={100}
        refresh
      />
    </div>
  );
}
