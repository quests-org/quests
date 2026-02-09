import { cn } from "@/client/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Favicon({
  className,
  url,
}: {
  className?: string;
  url: string;
}) {
  const hostname = URL.canParse(url) ? new URL(url).hostname : url;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <img
          alt={`Favicon for ${hostname}`}
          className={cn(
            "size-4 shrink-0 rounded-full border border-border/50 bg-background",
            className,
          )}
          src={getFaviconUrl(url)}
        />
      </TooltipTrigger>
      <TooltipContent>{hostname}</TooltipContent>
    </Tooltip>
  );
}

function getFaviconUrl(url: string): string {
  return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=64`;
}
