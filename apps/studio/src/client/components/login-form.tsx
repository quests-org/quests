import Particles from "@/client/components/particles";
import { Button } from "@/client/components/ui/button";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type RPCError } from "@/electron-main/lib/errors";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { telemetry } from "../lib/telemetry";

export function LoginForm({
  modal = false,
  onClose,
}: {
  modal?: boolean;
  onClose?: () => void;
}) {
  const [error, setError] = useState<null | RPCError>(null);
  const { mutateAsync: signInSocial } = useMutation(
    rpcClient.auth.signInSocial.mutationOptions(),
  );
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

  const handleContinueClick = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    captureClientEvent("login.button_clicked", {
      button_type: "google_sign_in",
    });

    try {
      await signInSocial({});
    } catch (error_) {
      telemetry?.captureException(error_);
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background overflow-y-auto">
      <div className="relative z-10 min-h-full w-full flex flex-1 justify-center items-center">
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
                  onSubmit={(e) => {
                    void handleContinueClick(e);
                  }}
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

                <div className="text-sm text-muted-foreground">or</div>

                <div className="flex items-center justify-center gap-3 relative">
                  <Button
                    className="w-full min-w-80"
                    onClick={() => {
                      captureClientEvent("login.button_clicked", {
                        button_type: "add_api_key",
                      });
                      void vanillaRpcClient.preferences.openSettingsWindow({
                        showNewProviderDialog: true,
                        tab: "Providers",
                      });
                      onClose?.();
                    }}
                    type="button"
                    variant="outline"
                  >
                    Add an AI Provider API key
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary border-t border-border/50 pt-6">
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
        </div>
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
