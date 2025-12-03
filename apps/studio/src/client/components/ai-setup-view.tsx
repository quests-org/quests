import { AddProviderDialog } from "@/client/components/add-provider/dialog";
import Particles from "@/client/components/particles";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { rpcClient } from "@/client/rpc/client";
import { type RPCError } from "@/electron-main/lib/errors";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { SiGoogle } from "react-icons/si";
import { toast } from "sonner";

export function AISetupView({ mode }: { mode: "setup" | "sign-in" }) {
  const [error, setError] = useState<null | RPCError>(null);
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);
  const { signIn } = useSignInSocial();
  const navigate = useNavigate();

  const { data: authSessionChanged, isFetched } = useQuery(
    rpcClient.user.live.me.experimental_liveOptions({}),
  );

  const { data: providerConfigs } = useQuery(
    rpcClient.providerConfig.live.list.experimental_liveOptions(),
  );

  const isSignedIn = authSessionChanged && !authSessionChanged.error;
  const hasProvider = (providerConfigs?.length ?? 0) > 0;
  const isReady = mode === "setup" ? isSignedIn || hasProvider : isSignedIn;

  useEffect(() => {
    if (authSessionChanged?.error) {
      setError(authSessionChanged.error);
    } else if (authSessionChanged && isFetched) {
      toast.dismiss();
    }
  }, [authSessionChanged, isFetched]);

  const handleContinueClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void signIn();
  };

  const handleGetStarted = () => {
    void navigate({ replace: true, to: "/new-tab" });
  };

  const title = mode === "setup" ? "Sign in to Quests" : "Sign in to Quests";
  const readyTitle = mode === "setup" ? "You're all set!" : "You're signed in!";
  const subtitle = "Sign in for free credits to start building with AI.";
  const readySubtitle = "You're now ready to start building!";

  return (
    <div className="flex min-h-svh flex-col bg-background overflow-y-auto">
      <div className="relative z-10 w-full flex flex-1 justify-center items-center py-8">
        <div className="max-w-sm">
          <div className="flex flex-col gap-6 pb-12">
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-md">
                  {isReady ? (
                    <div className="flex size-12 items-center justify-center rounded-full bg-brand">
                      <Check className="size-6 text-brand-foreground" />
                    </div>
                  ) : (
                    <QuestsAnimatedLogo size={64} />
                  )}
                </div>
                <span className="sr-only">Quests</span>
                <h1 className="text-3xl font-bold">
                  {isReady ? readyTitle : title}
                </h1>
                {!error && (
                  <p className="text-sm text-muted-foreground text-center max-w-md text-balance">
                    {isReady ? readySubtitle : subtitle}
                  </p>
                )}
              </div>

              {isReady ? (
                <Button
                  className="w-full min-w-80"
                  onClick={handleGetStarted}
                  variant="default"
                >
                  Get started
                </Button>
              ) : (
                <>
                  {error && (
                    <Alert className="w-full min-w-80" variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Sign in failed</AlertTitle>
                      <AlertDescription>
                        There was an error signing in. Please try again.
                      </AlertDescription>
                    </Alert>
                  )}

                  <form
                    className="flex items-center justify-center w-full"
                    onSubmit={handleContinueClick}
                  >
                    <Button
                      className="w-full min-w-80"
                      type="submit"
                      variant="default"
                    >
                      <SiGoogle />
                      Continue with Google
                    </Button>
                  </form>

                  {mode === "setup" && (
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
                  )}
                </>
              )}
            </div>

            <AddProviderDialog
              onOpenChange={setShowAddProviderDialog}
              onSuccess={() => {
                setShowAddProviderDialog(false);
                toast.success("Provider added successfully");
              }}
              open={showAddProviderDialog}
              providers={providerConfigs ?? []}
            />
          </div>
        </div>
      </div>
      {!isReady && (
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
      )}
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
