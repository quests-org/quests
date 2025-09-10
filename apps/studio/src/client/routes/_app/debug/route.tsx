import { ThemeToggle } from "@/client/components/theme-toggle";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

// Global variables for link styles
const linkBaseClasses =
  "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline";
const linkActiveClasses = "text-foreground! no-underline!";

export const Route = createFileRoute("/_app/debug")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-0 h-full flex-1">
      <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shrink-0">
        <nav className="flex items-center justify-between">
          <div className="flex gap-6">
            <Link
              activeProps={{
                className: linkActiveClasses,
              }}
              className={linkBaseClasses}
              to="/debug/components"
            >
              Components
            </Link>
            <Link
              activeProps={{
                className: linkActiveClasses,
              }}
              className={linkBaseClasses}
              to="/debug/colors"
            >
              Colors
            </Link>
            <Link
              activeProps={{
                className: linkActiveClasses,
              }}
              className={linkBaseClasses}
              to="/debug/bulk-delete"
            >
              Bulk Delete
            </Link>
            <Link
              activeProps={{
                className: linkActiveClasses,
              }}
              className={linkBaseClasses}
              to="/debug/pty"
            >
              PTY Terminal
            </Link>
          </div>
          <ThemeToggle />
        </nav>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
