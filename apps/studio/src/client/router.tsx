import type { FileRoutesByPath, RouterHistory } from "@tanstack/react-router";

import { DefaultErrorComponent } from "@/client/components/default-error-component";
import { NotFoundRouteComponent } from "@/client/components/not-found";
import { QueryClient } from "@tanstack/react-query";
import {
  createHashHistory,
  createRouter as createTanStackRouter,
} from "@tanstack/react-router";

import { telemetry } from "./lib/telemetry";
import { routeTree } from "./routeTree.gen";

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

// async function subscribeToUserChanges() {
//   let isAuthenticated = false;
//   const iterator = await vanillaRpcClient.user.live.session();
//   for await (const payload of iterator) {
//     const newIsAuthenticated = payload !== undefined;
//     if (isAuthenticated !== newIsAuthenticated) {
//       void router.invalidate();
//     }
//     isAuthenticated = payload !== undefined;
//   }
// }

// void subscribeToUserChanges().catch((error: unknown) => {
//   logger.error("Error subscribing to user changes", error);
// });
