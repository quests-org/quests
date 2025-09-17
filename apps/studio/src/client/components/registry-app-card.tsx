import { SmallAppIcon } from "@/client/components/app-icon";
import { InternalLink } from "@/client/components/internal-link";
import { cn } from "@/client/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";

import { rpcClient } from "../rpc/client";

export function RegistryAppCard({
  className,
  folderName,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  folderName: string;
}) {
  const { data: appDetails } = useQuery(
    rpcClient.workspace.registryApp.byFolderName.queryOptions({
      input: { folderName },
    }),
  );
  const { data: screenshotDataUrl } = useQuery(
    rpcClient.workspace.registryApp.screenshot.queryOptions({
      input: { folderName },
    }),
  );

  const title = appDetails?.title;
  const description = appDetails?.description;
  const icon = appDetails?.icon;

  return (
    <div className={cn("group relative block", className)} {...props}>
      <div className="flex flex-col gap-2">
        <InternalLink params={{ folderName }} to="/discover/apps/$folderName">
          <div className="overflow-hidden rounded-md border border-border relative">
            <div className="aspect-video w-full bg-muted flex items-center justify-center relative">
              {appDetails?.screenshotPath && screenshotDataUrl ? (
                <>
                  <img
                    alt={`Screenshot of ${title ?? "unknown"} app`}
                    className="w-full h-full object-cover"
                    src={screenshotDataUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </>
              ) : (
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground/75">No preview</p>
                </div>
              )}
            </div>
          </div>
        </InternalLink>
        <div className="flex items-start gap-2 text-sm">
          <SmallAppIcon
            background={icon?.background}
            icon={icon?.lucide}
            size="lg"
          />
          <div className="space-y-1 flex-1 min-w-0">
            <InternalLink
              params={{ folderName }}
              to="/discover/apps/$folderName"
            >
              <h3 className="font-medium leading-none text-foreground">
                {title}
              </h3>
            </InternalLink>
            {description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
