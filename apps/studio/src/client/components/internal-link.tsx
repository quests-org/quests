import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import {
  Link,
  type LinkProps,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import * as React from "react";

export function InternalLink(
  props: LinkProps &
    React.ComponentProps<"a"> & {
      allowOpenNewTab?: boolean;
      openInCurrentTab?: boolean;
    },
) {
  const { mutate: navigateInCurrentTab } = useMutation(
    rpcClient.tabs.navigateCurrent.mutationOptions(),
  );
  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const {
    allowOpenNewTab = true,
    onAuxClick,
    onClick,
    onMouseDown,
    openInCurrentTab = false,
    params,
    search,
    target,
    to,
    ...rest
  } = props;
  const router = useRouter();
  const navigate = useNavigate();

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

  const performNavigation = React.useCallback(
    (shouldOpenNewTab: boolean, selectTab = true) => {
      const location = router.buildLocation({ params, search, to });

      if (shouldOpenNewTab && allowOpenNewTab) {
        addTab({ select: selectTab, urlPath: location.href });
      } else if (openInCurrentTab) {
        navigateInCurrentTab({ urlPath: location.href });
      } else {
        void navigate({ params, search, to });
      }
    },
    [
      addTab,
      allowOpenNewTab,
      navigate,
      navigateInCurrentTab,
      openInCurrentTab,
      params,
      router,
      search,
      to,
    ],
  );

  const handleAuxClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Handle middle click via auxclick event (more reliable for some browsers)
      if (e.button === 1) {
        e.preventDefault();
        performNavigation(true, false);
      }
      if (onAuxClick) {
        onAuxClick(e);
      }
    },
    [onAuxClick, performNavigation],
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      // Handle left clicks and ctrl/cmd + left click
      if (e.button === 0) {
        const shouldOpenNewTab = e.ctrlKey || e.metaKey;
        performNavigation(shouldOpenNewTab, shouldOpenNewTab ? false : true);
      }

      if (onClick) {
        onClick(e);
      }
    },
    [onClick, performNavigation],
  );

  return (
    <Link
      {...rest}
      draggable={false}
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
