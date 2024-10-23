import type { ErrorComponentProps } from "@tanstack/react-router";

import { DefaultErrorComponent } from "@/client/components/default-error-component";
import { NotFoundRouteComponent } from "@/client/components/not-found";
import { ThemeProvider } from "@/client/components/theme-provider";
import { useUpdateNotifications } from "@/client/hooks/use-update-notifications";
import { type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouter,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootComponent,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundRouteComponent,
  pendingComponent: PendingComponent,
});

function ErrorComponent(props: ErrorComponentProps) {
  return (
    <Root>
      <DefaultErrorComponent {...props} />
    </Root>
  );
}

function PendingComponent() {
  return (
    <Root>
      <div className="flex items-center justify-center h-dvh">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </Root>
  );
}

function Root({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function RootComponent() {
  useUpdateNotifications();
  const router = useRouter();

  useEffect(() => {
    window.api.onNavigate((url) => {
      void router.navigate({ to: url });
    });

    window.api.onHistoryBack(() => {
      router.history.back();
    });

    window.api.onHistoryForward(() => {
      router.history.forward();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Root>
      <HeadContent />
      <Outlet />
    </Root>
  );
}
