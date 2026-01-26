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
  const { data: templatesHeroImageDataUrl } = useQuery(
    rpcClient.utils.imageDataURI.queryOptions({
      input: { filePath: "templates-hero.jpg" },
    }),
  );
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <NewTabDiscoverHeroCard
        heroImageDataUrl={templatesHeroImageDataUrl}
        href="/discover/templates"
        subtitle="Next.js, Svelte, Vue, and more"
        title="Templates"
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
          <div className="relative overflow-hidden rounded-md border border-border">
            <div className="relative flex aspect-video w-full items-center justify-center bg-muted">
              {heroImageDataUrl ? (
                <>
                  <img
                    alt={`Hero image for ${title}`}
                    className="h-full w-full object-cover"
                    src={heroImageDataUrl}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent" />
                </>
              ) : isEvalsCard ? (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand/5 via-brand/8 to-brand/10">
                  <FlaskConical className="size-12 text-brand" />
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
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
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </InternalLink>
        </div>
      </div>
    </div>
  );
}
