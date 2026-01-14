import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { useLiveUser } from "./use-live-user";

// Invalidates the router when the user authentication state changes.
// This is necessary because main tab pages can have authentication requirements,
// and when the user logs in/out, the router needs to re-evaluate route guards
// and potentially navigate to a different screen.
//
// This hook should only be used in the _app route component to ensure
// router invalidation happens at the app level when user state changes.
export function useInvalidateRouterOnUserChange() {
  const router = useRouter();
  const { data: user } = useLiveUser();
  const hadUserRef = useRef<boolean | null>(null);

  useEffect(() => {
    const hasUser = !!user;

    // Initialize on first run
    if (hadUserRef.current === null) {
      hadUserRef.current = hasUser;
      return;
    }

    // Only invalidate if the user state actually changed
    if (hadUserRef.current !== hasUser) {
      void router.invalidate();
      hadUserRef.current = hasUser;
    }
  }, [user, router]);
}
