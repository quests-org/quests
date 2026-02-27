import { useEffect } from "react";
import { usePanelRef } from "react-resizable-panels";
import { toast } from "sonner";

export function useCollapsiblePanel({
  collapsed,
  onCollapsedChange,
  toastMessage,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  toastMessage?: string;
}) {
  const panelRef = usePanelRef();

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    if (collapsed) {
      panel.collapse();
    } else {
      panel.expand();
      // expand() silently fails when the window is too narrow; sync state back on next frame.
      requestAnimationFrame(() => {
        if (panel.isCollapsed()) {
          onCollapsedChange(true);
          if (toastMessage) {
            toast.info(toastMessage);
          }
        }
      });
    }
  }, [collapsed, panelRef, onCollapsedChange, toastMessage]);

  return panelRef;
}
