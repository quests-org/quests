import { InternalLink } from "@/client/components/internal-link";
import { cn } from "@/client/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { type LinkProps } from "@tanstack/react-router";

import { rpcClient } from "../rpc/client";

interface DiscoverHeroCardProps {
  className?: string;
  heroImageDataUrl?: null | string;
  href: LinkProps["to"];
  subtitle?: string;
  title: string;
}

export function DiscoverHeroCards() {
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
    <div className="grid gap-6 md:grid-cols-2">
      <DiscoverHeroCard
        heroImageDataUrl={templatesHeroImageDataUrl}
        href="/discover/templates"
        subtitle="Next.js, Svelte, Vue, and more"
        title="Templates"
      />
      <DiscoverHeroCard
        heroImageDataUrl={appsHeroImageDataUrl}
        href="/discover/apps"
        subtitle="Explore example apps"
        title="Apps"
      />
    </div>
  );
}

function DiscoverHeroCard({
  className,
  heroImageDataUrl,
  href,
  subtitle,
  title,
  ...props
}: DiscoverHeroCardProps & React.HTMLAttributes<HTMLDivElement>) {
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </>
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
