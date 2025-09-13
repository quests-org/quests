import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { BottomView } from "./components/bottom-view";
import { CornerView } from "./components/corner-view";
import { FullView } from "./components/full-view";
import { type IframeMessage } from "./types";
import "./styles.css";

type AppStatus = HeartbeatResponse["status"] | null;

const isFullScreenStatus = (status: AppStatus): boolean =>
  status === "error" ||
  status === "not-found" ||
  status === "not-runnable" ||
  status === "loading";

export function App() {
  const [response, setResponse] = useState<HeartbeatResponse | null>(null);
  const [previousStatus, setPreviousStatus] = useState<AppStatus>(null);
  const [displayMode, setDisplayMode] = useState<"bottom" | "corner" | "full">(
    "corner",
  );
  const [isTransitioningFromError, setIsTransitioningFromError] =
    useState(false);

  const currentStatus = response?.status ?? null;
  const currentStatusRef = useRef(currentStatus);
  const retryAttemptsRef = useRef(0);
  const isFallbackPage = new URLSearchParams(window.location.search).has(
    "fallback",
  );

  useEffect(() => {
    currentStatusRef.current = currentStatus;
  }, [currentStatus]);

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

          const current = currentStatusRef.current;
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

          if (
            isFullScreenStatus(current) &&
            !isFullScreenStatus(newHeartbeat.status)
          ) {
            setIsTransitioningFromError(true);
          }

          setPreviousStatus(current);
          setResponse(newHeartbeat);
        } catch {
          // Failed to parse heartbeat data
        }
      });

      eventSource.addEventListener("error", () => {
        const fakeResponse: HeartbeatResponse = {
          errors: [
            {
              createdAt: Date.now(),
              message: "Failed to connect to workspace server",
              type: "router",
            },
          ],
          status: "error",
        };

        const current = currentStatusRef.current;
        setPreviousStatus(current);
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
    if (currentStatus === null) {
      return;
    }

    if (isFullScreenStatus(currentStatus)) {
      setDisplayMode("full");
      setIsTransitioningFromError(false);
    } else if (isTransitioningFromError) {
      setDisplayMode("corner");
      setIsTransitioningFromError(false);
    } else if (previousStatus === null && !isFullScreenStatus(currentStatus)) {
      setDisplayMode("corner");
    }
  }, [currentStatus, previousStatus, isTransitioningFromError]);

  useEffect(() => {
    sendParentMessage({ type: "display-mode", value: displayMode });
  }, [displayMode]);

  // Handle corner click
  const handleCornerClick = useCallback(() => {
    if (displayMode === "corner") {
      setDisplayMode("bottom");
    }
  }, [displayMode]);

  return (
    <>
      {displayMode === "corner" && currentStatus && (
        <button
          className="fixed bottom-4 right-4 h-10 w-10 cursor-pointer appearance-none border-0 bg-transparent p-0"
          onClick={handleCornerClick}
        >
          <CornerView response={response} status={currentStatus} />
        </button>
      )}

      {displayMode === "bottom" && (
        <div className="fixed bottom-0 left-0 right-0 h-full bg-white shadow-lg">
          <BottomView
            onDisplayModeChange={setDisplayMode}
            response={response}
            status={currentStatus}
          />
        </div>
      )}

      {displayMode === "full" && response && (
        <FullView onDisplayModeChange={setDisplayMode} response={response} />
      )}
    </>
  );
}

function sendParentMessage(message: IframeMessage) {
  window.parent.postMessage(message, "*");
}

const root = document.querySelector(`#root`);
if (root) {
  createRoot(root).render(<App />);
}
