import { isDefinedError, onError, os } from "@orpc/server";

import { captureServerException } from "../lib/capture-server-exception";
import { logger } from "../lib/electron-logger";
import { getTabsManager } from "../tabs";
import { type InitialRPCContext } from "./context";

export const base = os
  .$context<InitialRPCContext>()
  .errors({
    NOT_FOUND: {},
    UNAUTHORIZED: {},
  })
  .use(
    onError((error) => {
      if (isDefinedError(error)) {
        logger.error("orpc error", error);
        return;
      }

      captureServerException(error, { scopes: ["rpc"] });
    }),
  )
  // Injecting this dynamically since it relies on a globally mutable singleton
  .use(({ next }) => next({ context: { tabsManager: getTabsManager() } }));
