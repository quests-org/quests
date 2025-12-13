import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AddProviderDialog } from "@/client/components/add-provider/dialog";
import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { ErrorAlert } from "@/client/components/error-alert";
import { StarryLayout } from "@/client/components/starry-layout";
import { Button } from "@/client/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useSignInSocial } from "@/client/hooks/use-sign-in-social";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { type AIProviderType } from "@quests/shared";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { Check, CreditCard } from "lucide-react";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";

const FEATURED_PROVIDERS: AIProviderType[] = ["anthropic", "openai", "google"];

export function AISetupView({ mode }: { mode: "setup" | "sign-in" }) {
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);
  const { error, signIn } = useSignInSocial();
  const navigate = useNavigate();
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const { data: hasToken } = useQuery(
    rpcClient.auth.live.hasToken.experimental_liveOptions(),
  );

  const { data: providerConfigs } = useQuery(
    rpcClient.providerConfig.live.list.experimental_liveOptions(),
  );

  const hasProvider = (providerConfigs?.length ?? 0) > 0;
  const isReady = mode === "setup" ? hasToken || hasProvider : hasToken;

  const handleContinueClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void signIn();
  };

  const handleGetStarted = () => {
    void navigate({ replace: true, to: "/new-tab" });
  };

  const title = mode === "setup" ? "Sign in to Quests" : "Sign in to Quests";
  const readyTitle = mode === "setup" ? "You're all set!" : "You're signed in!";
  const subtitle = "Claim your free AI credits";
  const readySubtitle = "You're now ready to start building!";

  return (
    <StarryLayout
      footer={
        !isReady && (
          <>
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
          </>
        )
      }
    >
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
              <p className="text-sm text-muted-foreground text-center max-w-md text-balance">
                {isReady ? readySubtitle : subtitle}
              </p>
              {!isReady && (
                <div className="flex items-center gap-2.5 rounded-full bg-muted/30 px-4 py-2">
                  <span className="text-xs text-muted-foreground/80">
                    Use top models from
                  </span>
                  <div className="flex items-center gap-3">
                    {FEATURED_PROVIDERS.map((providerType) => {
                      const metadata = providerMetadataMap.get(providerType);
                      return (
                        <Tooltip key={providerType}>
                          <TooltipTrigger asChild>
                            <div className="text-foreground/60 hover:text-foreground transition-colors">
                              <AIProviderIcon
                                className="size-4"
                                type={providerType}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {metadata?.name ?? providerType}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground/80">
                    & more
                  </span>
                </div>
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
                  <ErrorAlert
                    className="w-full min-w-80"
                    subject="Sign In Error"
                    title="Sign in failed"
                  >
                    There was an error signing in. Please try again.
                  </ErrorAlert>
                )}

                <div className="flex flex-col items-center gap-3 w-full">
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
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                    <CreditCard className="size-3" />
                    <span>No card required</span>
                  </p>
                </div>

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
            }}
            open={showAddProviderDialog}
            providers={providerConfigs ?? []}
          />
        </div>
      </div>
    </StarryLayout>
  );
}
