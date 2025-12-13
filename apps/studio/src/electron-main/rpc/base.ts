import { hasToken } from "@/electron-main/api/utils";
import { type ErrorMap, onError, os } from "@orpc/server";

import { captureServerException } from "../lib/capture-server-exception";
import { getTabsManager } from "../tabs";
import { type InitialRPCContext } from "./context";

const ORPC_ERRORS = {
  NOT_FOUND: {},
  UNAUTHORIZED: {},
} as const satisfies ErrorMap;

const osBase = os.$context<InitialRPCContext>().errors(ORPC_ERRORS);

export const base = osBase
  .$context<InitialRPCContext>()
  // Injecting this dynamically since it relies on a globally mutable singleton
  .use(({ next }) => next({ context: { tabsManager: getTabsManager() } }))
  .use(({ next }) => next({ context: { hasToken: hasToken() } }))
  .use(
    onError((error) => {
      captureServerException(error, { scopes: ["rpc"] });
    }),
  );

const authRequired = osBase.middleware(async ({ context, errors, next }) => {
  if (!context.hasToken) {
    throw errors.UNAUTHORIZED();
  }

  return next();
});

export const authenticated = base.use(authRequired);
