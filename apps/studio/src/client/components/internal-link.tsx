import { useTabActions } from "@/client/hooks/use-tab-actions";
import { Link, type LinkProps, useNavigate } from "@tanstack/react-router";
import * as React from "react";

export function InternalLink(
  props: LinkProps &
    React.ComponentProps<"a"> & {
      allowOpenNewTab?: boolean;
      openInCurrentTab?: boolean;
      openInNewTab?: boolean;
    },
) {
  const { addTab, navigateTab } = useTabActions();
  const {
    allowOpenNewTab = true,
    onAuxClick,
    onClick,
    onMouseDown,
    openInCurrentTab = false,
    openInNewTab = false,
    params,
    search,
    target,
    to,
    ...rest
  } = props;
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
      if (shouldOpenNewTab && allowOpenNewTab) {
        void addTab({ params, search, to }, { select: selectTab });
      } else if (openInCurrentTab) {
        void navigateTab({ params, search, to });
      } else {
        void navigate({ params, search, to });
      }
    },
    [
      addTab,
      allowOpenNewTab,
      navigate,
      navigateTab,
      openInCurrentTab,
      params,
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
        const shouldOpenNewTab = e.ctrlKey || e.metaKey || openInNewTab;
        const selectTab = openInNewTab || !shouldOpenNewTab;
        performNavigation(shouldOpenNewTab, selectTab);
      }

      if (onClick) {
        onClick(e);
      }
    },
    [onClick, performNavigation, openInNewTab],
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
