import { ExternalLink } from "@/client/components/external-link";
import Particles from "@/client/components/particles";
import { Button } from "@/client/components/ui/button";
import { vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { APP_REPO_URL } from "@quests/shared";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/welcome")({
  beforeLoad: async () => {
    await vanillaRpcClient.sidebar.close();
  },
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Welcome to Quests",
        },
        {
          content: "quests",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

function FeatureCard({
  description,
  number,
  title,
}: {
  description: string;
  number: string;
  title: string;
}) {
  return (
    <div className="flex gap-5 rounded-lg bg-muted/50 p-4">
      <div className="flex-shrink-0">
        <div className="text-6xl font-bold text-foreground/10 leading-none tabular-nums">
          {number}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 pt-1">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-svh flex-col bg-background overflow-y-auto">
      <div className="relative z-10 min-h-full w-full flex flex-1 justify-center items-center py-8">
        <div className="max-w-xl w-full px-6">
          <div className="flex flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-6">
              <QuestsAnimatedLogo size={96} />
              <h1 className="text-4xl font-bold text-center">
                Welcome to Quests
              </h1>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <FeatureCard
                description="Private and secure, all apps run on your local computer. API keys are encrypted and stored locally."
                number="1"
                title="Everything runs locally"
              />
              <FeatureCard
                description="All the apps you create can use AI, powered by the AI providers you add."
                number="2"
                title="Use AI in your apps"
              />
              <FeatureCard
                description="The Discover page includes AI-powered starter apps you can use as a starting point for your own projects."
                number="3"
                title="Built-in apps"
              />
            </div>

            <div className="flex flex-col gap-5 w-full max-w-md mt-4">
              <Button
                className="w-full"
                onClick={() => void navigate({ to: "/setup" })}
                size="lg"
                variant="default"
              >
                Next
              </Button>
              <div className="text-center text-sm text-muted-foreground/80">
                Quests is{" "}
                <ExternalLink
                  className="hover:text-foreground underline underline-offset-2"
                  href={APP_REPO_URL}
                >
                  open source
                </ExternalLink>
                !
              </div>
            </div>
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
