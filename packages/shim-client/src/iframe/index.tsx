import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { useCallback, useEffect, useState } from "react";
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

  useEffect(() => {
    let isSubscribed = true;

    const heartbeat = async () => {
      if (!isSubscribed) {
        return;
      }

      try {
        const res = await fetch("/_quests/heartbeat", {
          body: JSON.stringify({ heartbeat: true }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const newHeartbeat = (await res.json()) as HeartbeatResponse;

        if (
          currentStatus !== null &&
          currentStatus !== "ready" &&
          newHeartbeat.status === "ready"
        ) {
          sendParentMessage({ type: "reload-window" });
        } else {
          sendParentMessage({ type: "app-status", value: newHeartbeat.status });
        }

        if (
          isFullScreenStatus(currentStatus) &&
          !isFullScreenStatus(newHeartbeat.status)
        ) {
          setIsTransitioningFromError(true);
        }

        setPreviousStatus(currentStatus);
        setResponse(newHeartbeat);
      } catch {
        const fakeResponse: HeartbeatResponse = {
          errors: [
            {
              createdAt: Date.now(),
              message: "Failed to connect to apps router",
              type: "router",
            },
          ],
          status: "error",
        };

        setPreviousStatus(currentStatus);
        setResponse(fakeResponse);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      await heartbeat();
    };

    // eslint-disable-next-line no-console
    heartbeat().catch(console.error);

    return () => {
      isSubscribed = false;
    };
  }, [currentStatus]);

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
