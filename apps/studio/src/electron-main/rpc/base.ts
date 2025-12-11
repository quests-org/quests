import { hasToken } from "@/electron-main/api/utils";
import { type ErrorMap, onError, os } from "@orpc/server";

import { registerProcedureInvalidation } from "../api/client";
import { captureServerException } from "../lib/capture-server-exception";
import { getTabsManager } from "../tabs";
import { type InitialRPCContext } from "./context";
import { type PublisherEventType } from "./publisher";

const ORPC_ERRORS = {
  NOT_FOUND: {},
  UNAUTHORIZED: {},
} as const satisfies ErrorMap;

interface ORPCMetadata {
  invalidateClientsOn?: PublisherEventType[];
}

const osBase = os.$context<InitialRPCContext>().errors(ORPC_ERRORS);

export const base = osBase
  .$meta<ORPCMetadata>({})
  .$context<InitialRPCContext>()
  // Injecting this dynamically since it relies on a globally mutable singleton
  .use(({ next }) => next({ context: { tabsManager: getTabsManager() } }))
  .use(({ next }) => next({ context: { hasToken: hasToken() } }))
  .use(async ({ next, path, procedure }) => {
    const meta = procedure["~orpc"].meta;
    if (meta.invalidateClientsOn) {
      registerProcedureInvalidation({
        eventTypes: meta.invalidateClientsOn,
        rpcPath: path,
      });
    }
    return await next();
  })
  .use(
    onError((error) => {
      captureServerException(error, { scopes: ["rpc"] });
    }),
  );

const authOptional = osBase.middleware(
  async ({ context, next }, _input, output) => {
    if (!context.hasToken) {
      return output(null);
    }

    return next();
  },
);

const authRequired = osBase.middleware(async ({ context, errors, next }) => {
  if (!context.hasToken) {
    throw errors.UNAUTHORIZED();
  }

  return next();
});

export const authenticated = base.use(authRequired);
export const authenticatedOptional = base.use(authOptional);
