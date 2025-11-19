import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { Overlay } from "./components/overlay";
import "./styles.css";
import { type ClientToIframeMessage, type IframeMessage } from "./types";

export function App() {
  useTheme();
  const [response, setResponse] = useState<HeartbeatResponse | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const previousStatusRef = useRef(response?.status ?? null);
  const retryAttemptsRef = useRef(0);
  const urlParams = new URLSearchParams(window.location.search);
  const isFallbackPage = urlParams.has("fallback");
  const isInsideStudio = navigator.userAgent.includes("Electron");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        typeof event.data === "object" &&
        "type" in event.data
      ) {
        const msg = event.data as ClientToIframeMessage;
        switch (msg.type) {
          case "hide-failed-to-render": {
            setShowRecovery(false);
            break;
          }
          case "show-failed-to-render": {
            setShowRecovery(true);
            break;
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource("/_quests/heartbeat-stream");

      eventSource.addEventListener("heartbeat", (event) => {
        try {
          const newHeartbeat = JSON.parse(
            event.data as string,
          ) as HeartbeatResponse;

          retryAttemptsRef.current = 0;

          const current = previousStatusRef.current;
          previousStatusRef.current = newHeartbeat.status;
          if (
            current !== null &&
            current !== "ready" &&
            newHeartbeat.status === "ready"
          ) {
            // Refresh when we see a change from not ready to ready
            sendParentMessage({ type: "reload-window" });
            return;
          } else if (isFallbackPage && newHeartbeat.status === "ready") {
            // Refresh if we're on the fallback page and we see ready
            sendParentMessage({ type: "reload-window" });
            return;
          } else {
            sendParentMessage({
              type: "app-status",
              value: newHeartbeat.status,
            });
          }

          setResponse(newHeartbeat);
        } catch {
          // Failed to parse heartbeat data
        }
      });

      eventSource.addEventListener("error", () => {
        const fakeResponse: HeartbeatResponse = {
          status: "error",
        };

        setResponse(fakeResponse);

        eventSource?.close();

        const baseDelay = Math.min(1000 * 2 ** retryAttemptsRef.current, 5000);
        const jitter = Math.random() * 100;
        retryAttemptsRef.current++;
        setTimeout(connectSSE, baseDelay + jitter);
      });
    };

    connectSSE();

    return () => {
      eventSource?.close();
    };
  }, [isFallbackPage]);

  useEffect(() => {
    if (showRecovery) {
      document.body.classList.add("transparent-bg");
    } else {
      document.body.classList.remove("transparent-bg");
    }

    return () => {
      document.body.classList.remove("transparent-bg");
    };
  }, [showRecovery]);

  return (
    <Overlay
      isInsideStudio={isInsideStudio}
      onDismissRecovery={() => {
        setShowRecovery(false);
        sendParentMessage({ type: "dismiss-recovery" });
      }}
      onOpenConsole={handleOpenConsole}
      onReload={() => {
        sendParentMessage({ type: "reload-window" });
      }}
      response={response}
      showRecovery={showRecovery}
    />
  );
}

function handleOpenConsole() {
  sendParentMessage({ type: "open-console" });
}

function sendParentMessage(message: IframeMessage) {
  window.parent.postMessage(message, "*");
}

function useTheme() {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    const queryMedia = window.matchMedia("(prefers-color-scheme: dark)");
    const systemTheme = queryMedia.matches ? "dark" : "light";
    root.classList.add(systemTheme);

    const listener = (e: MediaQueryListEvent) => {
      root.classList.remove("light", "dark");
      root.classList.add(e.matches ? "dark" : "light");
    };

    queryMedia.addEventListener("change", listener);
    return () => {
      queryMedia.removeEventListener("change", listener);
    };
  }, []);
}

const root = document.querySelector(`#root`);
if (root) {
  createRoot(root).render(<App />);
}
