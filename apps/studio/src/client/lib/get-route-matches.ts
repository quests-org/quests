import { type MakeRouteMatchUnion, useRouter } from "@tanstack/react-router";

interface NonDeprecatedMatchRoutesRouter {
  matchRoutes: (
    pathname: string,
    locationSearch?: Record<string, unknown>,
    opts?: { throwOnError?: boolean },
  ) => MakeRouteMatchUnion[];
}

export function useMatchesForPathname(pathname: string) {
  const router = useRouter();
  const [pathnameWithoutQuery, queryString] = pathname.split("?");
  const searchParams = queryString
    ? Object.fromEntries(new URLSearchParams(queryString))
    : undefined;
  const matches = (router as NonDeprecatedMatchRoutesRouter).matchRoutes(
    pathnameWithoutQuery ?? "",
    searchParams,
  );
  return matches;
}
