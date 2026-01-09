import { type ErrorMap, onError, os } from "@orpc/server";

import { hasToken } from "../api/utils";
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
  .use(({ next }) => next({ context: { tabsManager: getTabsManager() } }));

const authRequired = osBase.middleware(async ({ errors, next }) => {
  if (!hasToken()) {
    throw errors.UNAUTHORIZED();
  }

  return next();
});

export const authenticated = base.use(authRequired);
