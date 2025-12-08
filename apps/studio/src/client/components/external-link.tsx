import { captureClientEvent } from "@/client/lib/capture-client-event";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { isDefinedError } from "@orpc/client";
import { addRef } from "@quests/shared";
import { useMutation } from "@tanstack/react-query";
import * as React from "react";
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

  const handleClick = React.useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const url = event.currentTarget.href;
      if (url) {
        const finalUrl = addReferral ? addRef(url) : url;
        captureClientEvent("external_link.clicked", { url: finalUrl });
        await openExternalLinkMutation.mutateAsync({ url: finalUrl });
      }
      onClick?.(event);
    },
    [addReferral, onClick, openExternalLinkMutation],
  );

  return (
    <a
      {...rest}
      className={cn("cursor-pointer!", className)}
      href={href}
      onClick={handleClick}
    />
  );
}
