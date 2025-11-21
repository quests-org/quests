import { useRouter } from "@tanstack/react-router";

export function useMatchesForPathname(pathname: string) {
  const router = useRouter();
  const [pathnameWithoutQuery, queryString] = pathname.split("?");
  const searchParams = queryString
    ? Object.fromEntries(new URLSearchParams(queryString))
    : undefined;
  const matches = router.matchRoutes(pathnameWithoutQuery ?? "", searchParams);
  return matches;
}
