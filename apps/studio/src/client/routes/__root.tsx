import type { ErrorComponentProps } from "@tanstack/react-router";

import { DefaultErrorComponent } from "@/client/components/default-error-component";
import { NotFoundRouteComponent } from "@/client/components/not-found";
import { ThemeProvider } from "@/client/components/theme-provider";
import { type QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";

import { TooltipProvider } from "../components/ui/tooltip";
import { useReload } from "../hooks/use-reload";

export const Route = createRootRouteWithContext<{
  disableHotkeyReload?: boolean;
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
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    </Root>
  );
}

function Root({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </ThemeProvider>
  );
}

function RootComponent() {
  const matches = useRouterState({ select: (s) => s.matches });
  const disableHotkeyReload = matches.some(
    (match) => match.context.disableHotkeyReload,
  );

  useReload(
    useCallback(() => {
      if (disableHotkeyReload) {
        return;
      }
      window.location.reload();
    }, [disableHotkeyReload]),
  );

  return (
    <Root>
      <HeadContent />
      <Outlet />
    </Root>
  );
}
