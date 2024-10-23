import { StudioSidebar } from "@/client/components/studio-sidebar";
import { SidebarProvider } from "@/client/components/ui/sidebar";
import { isMacOS } from "@/client/lib/utils";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sidebar")({
  component: SidebarPage,
});

function SidebarPage() {
  return (
    <div
      className="h-screen w-full overflow-hidden flex flex-col border-r border-border overflow-x-hidden"
      style={
        {
          "--sidebar-width": "250px",
          width: "250px",
        } as React.CSSProperties
      }
    >
      <SidebarProvider>
        <div className="flex-1 min-h-0">
          <StudioSidebar className="h-full" disableBackground={isMacOS()} />
        </div>
      </SidebarProvider>
    </div>
  );
}
