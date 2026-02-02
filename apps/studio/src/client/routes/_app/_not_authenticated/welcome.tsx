import { ExternalLink } from "@/client/components/external-link";
import { StarryLayout } from "@/client/components/starry-layout";
import { Button } from "@/client/components/ui/button";
import { rpcClient } from "@/client/rpc/client";
import { createIconMeta } from "@/shared/tabs";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { APP_REPO_URL, DISCORD_URL } from "@quests/shared";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_not_authenticated/welcome")({
  beforeLoad: async () => {
    await rpcClient.sidebar.close.call();
  },
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Welcome to Quests",
        },
        createIconMeta("quests"),
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
    <div className="flex gap-4 rounded-lg bg-muted/50 p-3">
      <div className="shrink-0">
        <div className="text-4xl leading-none font-bold text-foreground/10 tabular-nums">
          {number}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm/relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <StarryLayout
      footer={
        <>
          Quests is <ExternalLink href={APP_REPO_URL}>open source</ExternalLink>
          <span className="mx-2">·</span>
          <ExternalLink href={DISCORD_URL}>Join us on Discord</ExternalLink>
        </>
      }
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6 pb-12">
          <div className="flex flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-md">
              <QuestsAnimatedLogo size={64} />
            </div>
            <h1 className="text-center text-3xl font-bold">
              Welcome to Quests
            </h1>
          </div>

          <div className="flex w-full flex-col gap-2">
            <FeatureCard
              description="Access the best AI models for free."
              number="1"
              title="Get started for free"
            />
            <FeatureCard
              description="Private and secure, all apps and chats are stored on your local computer."
              number="2"
              title="Apps are private and local"
            />
            <FeatureCard
              description="Explore built-in templates and example apps to start building in seconds."
              number="3"
              title="Discover templates and apps"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => void navigate({ to: "/setup" })}
            variant="default"
          >
            Next
          </Button>
        </div>
      </div>
    </StarryLayout>
  );
}
