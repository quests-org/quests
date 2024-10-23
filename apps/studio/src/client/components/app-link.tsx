import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { Link, type LinkProps, useRouter } from "@tanstack/react-router";
import * as React from "react";

export function AppLink(props: LinkProps & React.ComponentProps<"a">) {
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const { onClick, params, target, to, ...rest } = props;
  const router = useRouter();

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (target === "_blank" && to) {
        e.preventDefault();
        const location = router.buildLocation({ params, to });
        addTab({ urlPath: location.href });
      }
      if (onClick) {
        onClick(e);
      }
    },
    [addTab, onClick, target, to, params, router],
  );

  return (
    <Link
      {...rest}
      onClick={handleClick}
      params={params}
      target={target}
      to={to}
    />
  );
}
