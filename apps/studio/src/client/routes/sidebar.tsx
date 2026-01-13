import { StudioSidebar } from "@/client/components/studio-sidebar";
import { SidebarProvider } from "@/client/components/ui/sidebar";
import { isMacOS } from "@/client/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sidebar")({
  component: SidebarPage,
  head: () => ({
    meta: [
      {
        content: "",
        name: "transparent-background",
      },
    ],
  }),
});

function SidebarPage() {
  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden overflow-x-hidden border-r border-border select-none"
      data-testid="sidebar-page"
      style={
        {
          "--sidebar-width": "250px",
          width: "250px",
        } as React.CSSProperties
      }
    >
      <SidebarProvider>
        <div className="min-h-0 flex-1">
          <StudioSidebar className="h-full" disableBackground={isMacOS()} />
        </div>
      </SidebarProvider>
    </div>
  );
}
