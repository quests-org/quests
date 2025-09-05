import { type ShimIFrameMessage } from "@quests/shared/shim";
import { useCallback } from "react";

interface ShimIframeActions {
  historyBack: () => void;
  historyForward: () => void;
  reloadWindow: () => void;
  send: (message: ShimIFrameMessage) => void;
}

export function useShimIFrame(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
): ShimIframeActions {
  const send = useCallback(
    (message: ShimIFrameMessage) => {
      iframeRef.current?.contentWindow?.postMessage(message, "*");
    },
    [iframeRef],
  );

  const historyBack = useCallback(() => {
    send({ type: "history-back" });
  }, [send]);

  const historyForward = useCallback(() => {
    send({ type: "history-forward" });
  }, [send]);

  const reloadWindow = useCallback(() => {
    send({ type: "reload-window" });
  }, [send]);

  return {
    historyBack,
    historyForward,
    reloadWindow,
    send,
  };
}
