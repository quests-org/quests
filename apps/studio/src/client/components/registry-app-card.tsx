import { InternalLink } from "@/client/components/internal-link";
import { cn } from "@/client/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

import { rpcClient } from "../rpc/client";

export function RegistryAppCard({
  category,
  className,
  folderName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  category: "templates";
  folderName: string;
}) {
  const { data: appDetails } = useQuery(
    rpcClient.workspace.registry.template.byFolderName.queryOptions({
      input: { folderName },
    }),
  );
  const { data: screenshotDataUrl } = useQuery(
    rpcClient.workspace.registry.template.screenshot.queryOptions({
      input: { folderName },
    }),
  );

  const title = appDetails?.title;
  const description = appDetails?.description;

  return (
    <div className={cn("group relative block", className)} {...props}>
      <div className="flex flex-col gap-2">
        <InternalLink
          params={{ folderName }}
          to={`/discover/${category}/$folderName`}
        >
          <div className="relative overflow-hidden rounded-md border border-border">
            <div className="relative flex aspect-video w-full items-center justify-center bg-muted">
              {appDetails?.screenshotPath && screenshotDataUrl ? (
                <>
                  <img
                    alt={`Screenshot of ${title ?? "unknown"} app`}
                    className="h-full w-full object-cover"
                    src={screenshotDataUrl}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent" />
                </>
              ) : (
                <div className="text-center">
                  <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground/75">No preview</p>
                </div>
              )}
            </div>
          </div>
        </InternalLink>
        <div className="space-y-1 text-sm">
          <InternalLink
            params={{ folderName }}
            to={`/discover/${category}/$folderName`}
          >
            <h3 className="mb-1 leading-none font-medium text-foreground">
              {title}
            </h3>
          </InternalLink>
          {description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
