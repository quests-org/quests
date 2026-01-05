import { useTabActions } from "@/client/hooks/use-tab-actions";
import { Link, type LinkProps, useNavigate } from "@tanstack/react-router";
import { type MouseEvent, useEffect, useRef } from "react";

export function InternalLink(
  props: LinkProps & {
    allowOpenNewTab?: boolean;
    className?: string;
    onAuxClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
    onDoubleClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
    onMouseDown?: (e: MouseEvent<HTMLAnchorElement>) => void;
    openInCurrentTab?: boolean;
    openInNewTab?: boolean;
  },
) {
  const { addTab, navigateTab } = useTabActions();
  const {
    allowOpenNewTab = true,
    onAuxClick,
    onClick,
    onDoubleClick,
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
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: MouseEvent<HTMLAnchorElement>) => {
    // Prevent default for middle clicks to avoid opening in system browser
    if (e.button === 1) {
      e.preventDefault();
    }
    if (onMouseDown) {
      onMouseDown(e);
    }
  };

  const performNavigation = (shouldOpenNewTab: boolean, selectTab = true) => {
    if (shouldOpenNewTab && allowOpenNewTab) {
      void addTab({ params, search, to }, { select: selectTab });
    } else if (openInCurrentTab) {
      void navigateTab({ params, search, to });
    } else {
      void navigate({ params, search, to });
    }
  };

  const handleAuxClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Handle middle click via auxclick event (more reliable for some browsers)
    if (e.button === 1) {
      e.preventDefault();
      performNavigation(true, false);
    }
    if (onAuxClick) {
      onAuxClick(e);
    }
  };

  const handleDoubleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onDoubleClick) {
      // Cancel any pending navigation from the click
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      onDoubleClick(e);
    }
  };

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Handle left clicks and ctrl/cmd + left click
    if (e.button === 0) {
      // If we have a double-click handler, delay navigation slightly to detect double-click
      if (onDoubleClick) {
        const shouldOpenNewTab = e.ctrlKey || e.metaKey || openInNewTab;
        const selectTab = openInNewTab || !shouldOpenNewTab;

        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
        clickTimeoutRef.current = setTimeout(() => {
          performNavigation(shouldOpenNewTab, selectTab);
          clickTimeoutRef.current = null;
        }, 200);
      } else {
        const shouldOpenNewTab = e.ctrlKey || e.metaKey || openInNewTab;
        const selectTab = openInNewTab || !shouldOpenNewTab;
        performNavigation(shouldOpenNewTab, selectTab);
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link
      {...rest}
      draggable={false}
      onAuxClick={handleAuxClick}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      params={params}
      search={search}
      target={target}
      to={to}
    />
  );
}
