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
          toast.error(`${errorMessage}. URL copied to clipboard.`);
        } catch {
          toast.error(errorMessage);
        }
      },
    }),
  );

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const url = event.currentTarget.href;
      if (url) {
        const finalUrl = addReferral ? addRef(url) : url;
        captureClientEvent("external_link.clicked", {
          external_url: finalUrl,
        });
        await openExternalLinkMutation.mutateAsync({ url: finalUrl });
      }
      onClick?.(event);
    },
    [addReferral, onClick, openExternalLinkMutation],
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
