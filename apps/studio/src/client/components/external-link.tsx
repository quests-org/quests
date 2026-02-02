import { captureClientEvent } from "@/client/lib/capture-client-event";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { isDefinedError } from "@orpc/client";
import { addRef } from "@quests/shared";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

export function ExternalLink(
  props: React.ComponentProps<"a"> & {
    addReferral?: boolean;
  },
) {
  const { addReferral = true, className, href, onClick, ...rest } = props;

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions({
      onError: async (error, variables) => {
        const errorMessage = isDefinedError(error)
          ? error.message
          : "An unknown error occurred";

        try {
          await navigator.clipboard.writeText(variables.url);
          toast.error("Unable to open link in your browser", {
            description: (
              <div className="w-full space-y-1">
                <div className="text-sm">Link copied to clipboard.</div>
                <code className="block w-full overflow-x-auto rounded-sm bg-muted px-1 py-0.5 text-xs">
                  {variables.url}
                </code>
                <div className="text-xs text-muted-foreground">
                  Error: {errorMessage}
                </div>
              </div>
            ),
          });
        } catch {
          toast.error("Unable to open link in your browser", {
            description: errorMessage,
          });
        }
      },
    }),
  );

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (href) {
        const finalUrl = addReferral ? addRef(href) : href;
        captureClientEvent("external_link.clicked", {
          external_url: finalUrl,
        });
        await openExternalLinkMutation.mutateAsync({ url: finalUrl });
      }
      onClick?.(event);
    },
    [addReferral, onClick, openExternalLinkMutation, href],
  );

  return (
    // eslint-disable-next-line no-restricted-syntax
    <a
      {...rest}
      className={cn("cursor-pointer!", className)}
      href={href}
      onClick={handleClick}
    />
  );
}
