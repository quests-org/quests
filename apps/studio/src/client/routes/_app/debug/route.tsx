import { InternalLink } from "@/client/components/internal-link";
import { ThemeToggle } from "@/client/components/theme-toggle";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute, Outlet } from "@tanstack/react-router";

// Global variables for link styles
const linkBaseClasses =
  "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline";
const linkActiveClasses = "text-foreground! no-underline!";

export const Route = createFileRoute("/_app/debug")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Debug",
      },
      {
        content: "terminal",
        name: META_TAG_LUCIDE_ICON,
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 w-full shrink-0 border-b bg-background/95 p-4 backdrop-blur supports-backdrop-filter:bg-background/60">
        <nav className="flex items-center justify-between">
          <div className="flex gap-6">
            <InternalLink
              activeProps={{
                className: linkActiveClasses,
              }}
              className={linkBaseClasses}
              to="/debug/components"
            >
              Components
            </InternalLink>
            <InternalLink
              activeProps={{
                className: linkActiveClasses,
              }}
              className={linkBaseClasses}
              to="/debug/colors"
            >
              Colors
            </InternalLink>
          </div>
          <ThemeToggle />
        </nav>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
