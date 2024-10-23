import { type MakeRouteMatchUnion, useRouter } from "@tanstack/react-router";

interface NonDeprecatedMatchRoutesRouter {
  matchRoutes: (pathname: string) => MakeRouteMatchUnion[];
}

export function useMatchesForPathname(pathname: string) {
  const router = useRouter();
  // matchRoutes is deprecated but we need to use it. We cast instead of using
  // an eslint-disable comment since no-deprecated is disabled in dev for performance.
  const matches = (router as NonDeprecatedMatchRoutesRouter).matchRoutes(
    pathname,
  );
  return matches;
}
