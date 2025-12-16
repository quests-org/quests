// WARNING: Files cannot be shared between the client and the iframe or else
// it will cause an infinite loop on import due to Vite's build. Not sure why.
import {
  type ConsoleLogType,
  type ShimIFrameMessage,
  type ShimIFrameOutMessage,
} from "@quests/shared/shim";
import { SHIM_IFRAME_BASE_PATH } from "@quests/workspace/for-shim";
import { sprintf } from "sprintf-js";

import {
  type ClientToIframeMessage,
  type IframeMessage,
  type IframeMessageHandler,
} from "../iframe/types";

const QUESTS_IFRAME_CLASSES = {
  base: "quests-iframe",
  visible: "quests-iframe--visible",
} as const;

const FALLBACK_URL_PARAM = "fallback";
const WORKSPACE_FALLBACK_PAGE_META_NAME = "workspace-fallback-page";
const REFRESH_KEY = "quests-refresh";

const style = document.createElement("style");
style.textContent = `
  .${QUESTS_IFRAME_CLASSES.base} {
    background-color: transparent;
    border: none;
    bottom: 0;
    position: fixed;
    left: 0;
    height: 100%;
    width: 100%;
    border-radius: 0;
    display: none;
  }
  
  .${QUESTS_IFRAME_CLASSES.visible} {
    display: block;
  }
`;
document.head.append(style);

const messageHandlers = new Set<IframeMessageHandler>();

export function addMessageHandler(handler: IframeMessageHandler) {
  messageHandlers.add(handler);
}

export function removeMessageHandler(handler: IframeMessageHandler) {
  messageHandlers.delete(handler);
}

/* eslint-disable no-console */
const originalConsole = {
  debug: console.debug.bind(console),
  error: console.error.bind(console),
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
};

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ""}`;
      }
      if (typeof arg === "string") {
        return arg;
      }
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return "Unserializable object";
        }
      }
      return String(arg);
    })
    .join(" ");
}

function interceptConsoleMethod(methodName: keyof typeof originalConsole) {
  console[methodName] = (...args: unknown[]) => {
    (originalConsole[methodName] as (...args: unknown[]) => void)(...args);
    sendConsoleLog(methodName, args);
  };
}
/* eslint-enable no-console */

function sendConsoleLog(type: ConsoleLogType, args: unknown[]) {
  try {
    let formattedMessage: string;

    if (
      args.length > 0 &&
      typeof args[0] === "string" &&
      args[0].includes("%")
    ) {
      try {
        formattedMessage = sprintf(args[0], ...args.slice(1));
      } catch {
        formattedMessage = formatArgs(args);
      }
    } else {
      formattedMessage = formatArgs(args);
    }

    const message: ShimIFrameOutMessage = {
      type: "console-log",
      value: {
        message: formattedMessage,
        type,
      },
    };

    window.parent.postMessage(message, "*");
  } catch (error) {
    originalConsole.error("Failed to send console log:", error);
  }
}

function sendUncaughtError(error: Error) {
  try {
    const formattedMessage = error.stack || `${error.name}: ${error.message}`;

    const message: ShimIFrameOutMessage = {
      type: "console-log",
      value: {
        message: `Uncaught ${formattedMessage}`,
        type: "error",
      },
    };

    window.parent.postMessage(message, "*");
  } catch (postError) {
    originalConsole.error("Failed to send uncaught error:", postError);
  }
}

const consoleMethods = ["debug", "error", "info", "log", "warn"] as const;

for (const method of consoleMethods) {
  interceptConsoleMethod(method);
}

window.addEventListener("error", (event) => {
  sendUncaughtError(
    event.error instanceof Error ? event.error : new Error(event.message),
  );
});

window.addEventListener("unhandledrejection", (event) => {
  const error =
    event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
  sendUncaughtError(error);
});

const iframe = document.createElement("iframe");

window.addEventListener("beforeunload", () => {
  try {
    const message: ShimIFrameOutMessage = {
      type: "will-reload",
    };
    window.parent.postMessage(message, "*");
  } catch {
    // Ignore errors during unload
  }
});

window.addEventListener("message", (event) => {
  if (event.source === iframe.contentWindow) {
    const message = event.data as IframeMessage;

    if (message.type === "app-status") {
      if (message.value === "ready") {
        iframe.classList.remove(QUESTS_IFRAME_CLASSES.visible);
      } else {
        iframe.classList.add(QUESTS_IFRAME_CLASSES.visible);
      }
    }

    if (message.type === "reload-window") {
      window.location.reload();
    }

    if (message.type === "dismiss-recovery") {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      isShowingRecovery = false;
      iframe.classList.remove(QUESTS_IFRAME_CLASSES.visible);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      stopRecoveryChecks?.();
    }

    if (message.type === "open-console") {
      const outMessage: ShimIFrameOutMessage = {
        type: "open-console",
      };
      window.parent.postMessage(outMessage, "*");
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

    if (message.type === "set-studio-environment") {
      iframe.contentWindow?.postMessage(
        { type: "set-studio-environment" } satisfies ClientToIframeMessage,
        "*",
      );
    }
  }
});

const isFallbackPage =
  document.querySelector(
    `meta[name="${WORKSPACE_FALLBACK_PAGE_META_NAME}"]`,
  ) !== null;
const iframeUrl = new URL(`${SHIM_IFRAME_BASE_PATH}/`, window.location.origin);
if (isFallbackPage) {
  iframeUrl.searchParams.set(FALLBACK_URL_PARAM, "true");
}

iframe.src = iframeUrl.toString();
iframe.className = QUESTS_IFRAME_CLASSES.base;
document.body.append(iframe);

let hasRendered = false;
let isShowingRecovery = false;
let stopRecoveryChecks: (() => void) | undefined;
const initialCheckTime = Date.now();

// Sometimes dev servers can become overloaded and never render the app. We try
// to detect this and show a recovery overlay.
function hasAppRendered() {
  for (const node of document.body.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true;
    }
  }

  for (const element of document.body.children) {
    if (element === iframe) {
      continue;
    }
    if (element.classList.contains(QUESTS_IFRAME_CLASSES.base)) {
      continue;
    }

    const tagName = element.tagName;
    if (
      ["LINK", "META", "NOSCRIPT", "SCRIPT", "STYLE", "TEMPLATE"].includes(
        tagName,
      )
    ) {
      continue;
    }

    // If it has children, we assume content
    if (element.childElementCount > 0) {
      return true;
    }

    // If it has text content
    if (element.textContent && element.textContent.trim().length > 0) {
      return true;
    }

    // If it's a standalone visual element
    if (
      [
        "AUDIO",
        "BUTTON",
        "CANVAS",
        "IFRAME",
        "IMG",
        "INPUT",
        "METER",
        "PROGRESS",
        "SELECT",
        "SVG",
        "TEXTAREA",
        "VIDEO",
      ].includes(tagName)
    ) {
      return true;
    }
  }

  return false;
}

function hideRecovery() {
  if (!isShowingRecovery) {
    return;
  }
  isShowingRecovery = false;
  iframe.classList.remove(QUESTS_IFRAME_CLASSES.visible);
  const message: ClientToIframeMessage = {
    type: "hide-failed-to-render",
  };
  iframe.contentWindow?.postMessage(message, "*");
}

function showRecovery() {
  if (isShowingRecovery) {
    return;
  }

  isShowingRecovery = true;
  iframe.classList.add(QUESTS_IFRAME_CLASSES.visible);

  const message: ClientToIframeMessage = {
    type: "show-failed-to-render",
  };

  iframe.contentWindow?.postMessage(message, "*");
}

function tryAutoRefresh(): boolean {
  const lastAutoRefresh = sessionStorage.getItem(REFRESH_KEY);
  const now = Date.now();
  const MIN_REFRESH_INTERVAL = 60 * 1000; // 1 minute

  if (
    !lastAutoRefresh ||
    now - Number.parseInt(lastAutoRefresh, 10) > MIN_REFRESH_INTERVAL
  ) {
    sessionStorage.setItem(REFRESH_KEY, now.toString());
    window.location.reload();
    return true;
  }
  return false;
}

if (isFallbackPage) {
  // Fallback page is intentionally blank. The iframe will handle transitioning
  // to the app.
  hasRendered = true;
} else if (hasAppRendered()) {
  hasRendered = true;
} else {
  const observer = new MutationObserver(() => {
    if (hasAppRendered()) {
      hasRendered = true;
      hideRecovery();
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  // Fallback check in case mutation observer misses something or logic delays
  // Also handles the initial timeout
  const checkInterval = setInterval(() => {
    if (hasRendered) {
      clearInterval(checkInterval);
      return;
    }

    if (hasAppRendered()) {
      hasRendered = true;
      hideRecovery();
      clearInterval(checkInterval);
      observer.disconnect();
      return;
    }

    const elapsed = Date.now() - initialCheckTime;

    if (elapsed >= 5000 && !isShowingRecovery) {
      tryAutoRefresh();
    }

    if (elapsed >= 10_000) {
      showRecovery();
      // We don't clear interval here, we keep checking in case it renders later
      // to allow hiding the recovery screen.
    }
  }, 500);

  stopRecoveryChecks = () => {
    clearInterval(checkInterval);
    observer.disconnect();
  };
}
