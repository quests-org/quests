import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { AddProviderDialog } from "@/client/components/add-provider/dialog";
import { AIProviderIcon } from "@/client/components/ai-provider-icon";
import { ContactErrorAlert } from "@/client/components/contact-error-alert";
import { GoogleSignInButton } from "@/client/components/google-sign-in-button";
import { ManualProviderButton } from "@/client/components/manual-provider-button";
import { StarryLayout } from "@/client/components/starry-layout";
import { TermsFooter } from "@/client/components/terms-footer";
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
import { Check } from "lucide-react";
import { useState } from "react";

const FEATURED_PROVIDERS: AIProviderType[] = ["anthropic", "openai", "google"];

export function AISetupView({ mode }: { mode: "setup" | "sign-in" }) {
  const [showAddProviderDialog, setShowAddProviderDialog] = useState(false);
  const { error } = useSignInSocial();
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

  const handleGetStarted = () => {
    void navigate({ replace: true, to: "/new-tab" });
  };

  const title = mode === "setup" ? "Sign in to Quests" : "Sign in to Quests";
  const readyTitle = mode === "setup" ? "You're all set!" : "You're signed in!";
  const subtitle = "Claim your free AI credits, no card required";
  const readySubtitle = "You're now ready to start building!";

  return (
    <StarryLayout footer={!isReady && <TermsFooter />}>
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
              <p className="max-w-md text-center text-sm text-balance text-muted-foreground">
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
                            <div className="text-foreground/60 transition-colors hover:text-foreground">
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
                  <ContactErrorAlert
                    className="w-full min-w-80"
                    subject="Sign In Error"
                    title="Sign in failed"
                  >
                    There was an error signing in. Please try again.
                  </ContactErrorAlert>
                )}

                <GoogleSignInButton className="w-full min-w-80" />

                {mode === "setup" && (
                  <ManualProviderButton
                    onClick={() => {
                      setShowAddProviderDialog(true);
                    }}
                  />
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
