import { InternalLink } from "@/client/components/internal-link";
import { cn } from "@/client/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type LinkProps } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

import { rpcClient } from "../rpc/client";

interface DiscoverHeroCardProps {
  className?: string;
  heroImageDataUrl?: null | string;
  href: LinkProps["to"];
  subtitle?: string;
  title: string;
}

export function NewTabDiscoverHeroCards() {
  const { data: appsHeroImageDataUrl } = useQuery(
    rpcClient.utils.imageDataURI.queryOptions({
      input: { filePath: "apps-hero.jpg" },
    }),
  );
  const { data: templatesHeroImageDataUrl } = useQuery(
    rpcClient.utils.imageDataURI.queryOptions({
      input: { filePath: "templates-hero.jpg" },
    }),
  );
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <NewTabDiscoverHeroCard
        heroImageDataUrl={templatesHeroImageDataUrl}
        href="/discover/templates"
        subtitle="Next.js, Svelte, Vue, and more"
        title="Templates"
      />
      <NewTabDiscoverHeroCard
        heroImageDataUrl={appsHeroImageDataUrl}
        href="/discover/apps"
        subtitle="Explore example apps"
        title="Apps"
      />
      <NewTabDiscoverHeroCard
        href="/evals"
        subtitle="Experiment with prompts and models"
        title="Evals"
      />
    </div>
  );
}

function NewTabDiscoverHeroCard({
  className,
  heroImageDataUrl,
  href,
  subtitle,
  title,
  ...props
}: DiscoverHeroCardProps & React.HTMLAttributes<HTMLDivElement>) {
  const isEvalsCard = href === "/evals";

  return (
    <div className={cn("group relative block", className)} {...props}>
      <div className="flex flex-col gap-2">
        <InternalLink to={href}>
          <div className="overflow-hidden rounded-md border border-border relative">
            <div className="aspect-video w-full bg-muted flex items-center justify-center relative">
              {heroImageDataUrl ? (
                <>
                  <img
                    alt={`Hero image for ${title}`}
                    className="w-full h-full object-cover"
                    src={heroImageDataUrl}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </>
              ) : isEvalsCard ? (
                <div className="flex items-center justify-center w-full h-full bg-linear-to-br from-brand/5 via-brand/8 to-brand/10">
                  <FlaskConical className="size-12 text-brand" />
                </div>
              ) : (
                <div className="text-center">
                  <div className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground/75">Loading...</p>
                </div>
              )}
            </div>
          </div>
        </InternalLink>
        <div className="text-left">
          <InternalLink to={href}>
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </InternalLink>
        </div>
      </div>
    </div>
  );
}
