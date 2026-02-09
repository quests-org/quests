import { cn } from "@/client/lib/utils";

export function Favicon({
  className,
  url,
}: {
  className?: string;
  url: string;
}) {
  return (
    <img
      alt=""
      className={cn(
        "size-4 shrink-0 rounded-full border border-border/50 bg-background",
        className,
      )}
      src={getFaviconUrl(url)}
    />
  );
}

function getFaviconUrl(url: string): string {
  return `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(url)}&size=64`;
}
