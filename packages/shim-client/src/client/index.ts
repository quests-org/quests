// WARNING: Files cannot be shared between the client and the iframe or else
// it will cause an infinite loop on import due to Vite's build. Not sure why.
import {
  type ConsoleLogType,
  type ShimIFrameMessage,
  type ShimIFrameOutMessage,
} from "@quests/shared/shim";
import { SHIM_IFRAME_BASE_PATH } from "@quests/workspace/for-shim";

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

function interceptConsoleMethod(methodName: keyof typeof originalConsole) {
  console[methodName] = (...args: unknown[]) => {
    (originalConsole[methodName] as (...args: unknown[]) => void)(...args);
    sendConsoleLog(methodName, args);
  };
}
/* eslint-enable no-console */

function sendConsoleLog(type: ConsoleLogType, args: unknown[]) {
  try {
    const formattedMessage = args
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

const isFallbackPage =
  document.querySelector(`meta[name="workspace-fallback-page"]`) !== null;
const iframeUrl = new URL(`${SHIM_IFRAME_BASE_PATH}/`, window.location.origin);
if (isFallbackPage) {
  iframeUrl.searchParams.set("fallback", "true");
}

iframe.src = iframeUrl.toString();
iframe.className = "quests-iframe quests-iframe--full";
document.body.append(iframe);
