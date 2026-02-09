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
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=${url}&sz=32`;
  }
}
