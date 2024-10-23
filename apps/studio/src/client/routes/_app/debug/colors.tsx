import { Card } from "@/client/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/debug/colors")({
  component: RouteComponent,
});

function RouteComponent() {
  const colors = [
    { class: "bg-background", name: "background" },
    { class: "bg-foreground", name: "foreground" },
    { class: "bg-primary", name: "primary" },
    { class: "bg-primary-foreground", name: "primary-foreground" },
    { class: "bg-secondary", name: "secondary" },
    { class: "bg-secondary-foreground", name: "secondary-foreground" },
    { class: "bg-brand", name: "brand" },
    { class: "bg-brand-foreground", name: "brand-foreground" },
    { class: "bg-muted", name: "muted" },
    { class: "bg-muted-foreground", name: "muted-foreground" },
    { class: "bg-accent", name: "accent" },
    { class: "bg-accent-foreground", name: "accent-foreground" },
    { class: "bg-destructive", name: "destructive" },
    { class: "bg-destructive-foreground", name: "destructive-foreground" },
    { class: "bg-card", name: "card" },
    { class: "bg-card-foreground", name: "card-foreground" },
    { class: "bg-popover", name: "popover" },
    { class: "bg-popover-foreground", name: "popover-foreground" },
    { class: "bg-input", name: "input" },
    { class: "bg-ring", name: "ring" },
    { class: "bg-border", name: "border" },
    { class: "bg-sidebar", name: "sidebar" },
    { class: "bg-sidebar-foreground", name: "sidebar-foreground" },
    { class: "bg-sidebar-border", name: "sidebar-border" },
    { class: "bg-sidebar-ring", name: "sidebar-ring" },
    { class: "bg-sidebar-primary", name: "sidebar-primary" },
    {
      class: "bg-sidebar-primary-foreground",
      name: "sidebar-primary-foreground",
    },
    { class: "bg-sidebar-accent", name: "sidebar-accent" },
    {
      class: "bg-sidebar-accent-foreground",
      name: "sidebar-accent-foreground",
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="w-full p-8">
        <div
          className={`
            md:grids-col-2
            md:gap-4
            grid lg:grid-cols-10
            xl:grid-cols-11 xl:gap-4
          `}
        >
          <Card className="lg:col-span-4 xl:col-span-4">
            <div
              className={`
                flex flex-row items-center justify-between space-y-0 p-6 pb-2
              `}
            >
              <div className="text-sm font-normal tracking-tight">
                Theme Colors
              </div>
            </div>
            <div
              className={`
                grid grid-cols-2 gap-4 p-6 pt-2
                md:grid-cols-3
                lg:grid-cols-4
              `}
            >
              {colors.map((color) => (
                <div
                  className="flex flex-col items-center gap-2"
                  key={color.name}
                >
                  <div
                    className={`
                      h-8 w-full rounded-md
                      ${color.class}
                      border border-border
                    `}
                  />
                  <span className="text-xs font-medium leading-none">
                    {color.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
