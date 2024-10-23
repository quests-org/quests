import type { ErrorComponentProps } from "@tanstack/react-router";

import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";

export function DefaultErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    select: (state) => state.id === rootRouteId,
    strict: false,
  });

  return (
    <div
      className={`
        flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4
      `}
    >
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={`
            rounded bg-muted px-2 py-1 font-extrabold uppercase text-white
          `}
          onClick={() => {
            void router.invalidate();
          }}
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            className={`
              rounded bg-muted px-2 py-1 font-extrabold uppercase text-white
            `}
            to="/"
          >
            Home
          </Link>
        ) : (
          <Link
            className={`
              rounded bg-muted px-2 py-1 font-extrabold uppercase text-white
            `}
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
            to="/"
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  );
}
