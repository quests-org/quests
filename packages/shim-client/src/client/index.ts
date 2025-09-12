import { type ShimIFrameMessage } from "@quests/shared/shim";
import { SHIM_IFRAME_BASE_PATH } from "@quests/workspace/for-shim";
import * as Sentry from "@sentry/browser";

import { type IframeMessage, type IframeMessageHandler } from "../iframe/types";

const style = document.createElement("style");
style.textContent = `
  .quests-iframe {
    background-color: transparent;
    border: none;
    bottom: 0;
    position: fixed;
    left: 0;
  }
  
  .quests-iframe--bottom {
    display: block;
    height: 20dvh;
    width: 100%;
    border-radius: 0;
  }
  
  .quests-iframe--corner {
    display: block;
    height: 4rem;
    width: 4rem;
    border-radius: 2rem;
  }
  
  .quests-iframe--full {
    display: block;
    height: 100%;
    width: 100%;
    border-radius: 0;
  }
`;
document.head.append(style);
Sentry.init({
  dsn: "https://1@2.ingest.sentry.io/3",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.consoleLoggingIntegration(),
  ],
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  sampleRate: 1,
  tracesSampleRate: 0,
  tunnel: "/_quests/envelope",
});

const messageHandlers = new Set<IframeMessageHandler>();

export function addMessageHandler(handler: IframeMessageHandler) {
  messageHandlers.add(handler);
}

export function removeMessageHandler(handler: IframeMessageHandler) {
  messageHandlers.delete(handler);
}

const iframe = document.createElement("iframe");

window.addEventListener("message", (event) => {
  if (event.source === iframe.contentWindow) {
    const message = event.data as IframeMessage;

    if (message.type === "display-mode") {
      iframe.classList.remove(
        "quests-iframe--bottom",
        "quests-iframe--corner",
        "quests-iframe--full",
      );
      iframe.classList.add(`quests-iframe--${message.value}`);
    }

    if (message.type === "reload-window") {
      window.location.reload();
    }

    for (const handler of messageHandlers) {
      handler(message);
    }
  }

  if (
    typeof event.data === "object" &&
    event.data !== null &&
    "type" in event.data
  ) {
    const message = event.data as ShimIFrameMessage;
    if (message.type === "reload-window") {
      window.location.reload();
    }

    if (message.type === "history-back") {
      window.history.back();
    }

    if (message.type === "history-forward") {
      window.history.forward();
    }
  }
});

// const isFallbackPage =
//   document.querySelector(`meta[name="${FALLBACK_PAGE_META_NAME}"]`) !== null;
// const iframeUrl = new URL(`${SHIM_IFRAME_BASE_PATH}/`, window.location.origin);
// if (isFallbackPage) {
//   iframeUrl.searchParams.set(FALLBACK_PAGE_QUERY_PARAM, "true");
// }

// TODO: Temporary fix for the fallback page infinite loop. will resolve later
iframe.src = `${SHIM_IFRAME_BASE_PATH}/`;
iframe.className = "quests-iframe quests-iframe--full";
document.body.append(iframe);
