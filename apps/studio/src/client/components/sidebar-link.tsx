import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { Link, type LinkProps, useRouter } from "@tanstack/react-router";
import * as React from "react";

export function SidebarLink(props: LinkProps & React.ComponentProps<"a">) {
  const { mutate: navigateCurrent } = useMutation(
    rpcClient.tabs.navigateCurrent.mutationOptions(),
  );
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const {
    onAuxClick,
    onClick,
    onMouseDown,
    params,
    search,
    target,
    to,
    ...rest
  } = props;
  const router = useRouter();

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Prevent default for middle clicks to avoid opening in system browser
      if (e.button === 1) {
        e.preventDefault();
      }
      if (onMouseDown) {
        onMouseDown(e);
      }
    },
    [onMouseDown],
  );

  const handleAuxClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Handle middle click via auxclick event (more reliable for some browsers)
      if (e.button === 1) {
        e.preventDefault();
        const location = router.buildLocation({ params, search, to });
        addTab({ urlPath: location.href });
      }
      if (onAuxClick) {
        onAuxClick(e);
      }
    },
    [addTab, onAuxClick, params, router, search, to],
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const location = router.buildLocation({ params, search, to });

      // Handle left clicks and ctrl/cmd + left click
      if (e.button === 0) {
        if (e.ctrlKey || e.metaKey) {
          addTab({ urlPath: location.href });
        } else {
          navigateCurrent({ urlPath: location.href });
        }
      }

      if (onClick) {
        onClick(e);
      }
    },
    [addTab, navigateCurrent, onClick, params, router, search, to],
  );

  return (
    <Link
      {...rest}
      onAuxClick={handleAuxClick}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      params={params}
      search={search}
      target={target}
      to={to}
    />
  );
}
