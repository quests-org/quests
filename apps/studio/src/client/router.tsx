import type { FileRoutesByPath, RouterHistory } from "@tanstack/react-router";

import { DefaultErrorComponent } from "@/client/components/default-error-component";
import { NotFoundRouteComponent } from "@/client/components/not-found";
import { safe } from "@orpc/client";
import { QueryClient } from "@tanstack/react-query";
import {
  createHashHistory,
  createRouter as createTanStackRouter,
} from "@tanstack/react-router";

import { logger } from "./lib/logger";
import { telemetry } from "./lib/telemetry";
import { routeTree } from "./routeTree.gen";
import { vanillaRpcClient } from "./rpc/client";

const IGNORED_PATHS = new Set<keyof FileRoutesByPath>([
  "/sidebar", // Always rendered as separate view in Electron app
  "/toolbar", // Always rendered as separate view in Electron app
]);

function createRouter(options?: { history?: RouterHistory }) {
  const queryClient = new QueryClient();

  const router = createTanStackRouter({
    context: { queryClient },
    defaultErrorComponent: DefaultErrorComponent,
    defaultNotFoundComponent: NotFoundRouteComponent,
    defaultPreload: "intent",
    history: options?.history,
    routeTree,
    scrollRestoration: true,
  });

  router.subscribe("onRendered", (event) => {
    if (
      IGNORED_PATHS.has(event.toLocation.pathname as keyof FileRoutesByPath)
    ) {
      return;
    }
    telemetry?.capture("$pageview");
  });

  return {
    queryClient,
    router,
  };
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>["router"];
  }
}

const history = createHashHistory({});

export const { queryClient, router } = createRouter({ history });

window.api.onNavigate((url) => {
  void router.navigate({ to: url });
});

async function subscribeToUserChanges() {
  const [initialError, initialResult] = await safe(
    vanillaRpcClient.user.me({}),
  );
  let hadUser = initialError ? false : initialResult.data !== null;

  const iterator = await vanillaRpcClient.user.live.me();
  for await (const _payload of iterator) {
    const [error, result] = await safe(vanillaRpcClient.user.me({}));
    if (error) {
      continue;
    }
    const hasUser = result.data !== null;
    if (hadUser !== hasUser) {
      void router.invalidate();
    }
    hadUser = hasUser;
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void subscribeToUserChanges().catch((error: unknown) => {
  logger.error("Error subscribing to user changes", error);
});
