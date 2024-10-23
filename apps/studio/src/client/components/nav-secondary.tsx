import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/client/components/ui/sidebar";
import { type LucideIcon } from "lucide-react";
import * as React from "react";

export function NavSecondary({
  asGroup = true,
  items,
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup> & {
  asGroup?: boolean;
  items: {
    icon: LucideIcon;
    onClick?: () => void;
    title: string;
    url?: string;
  }[];
}) {
  const menuContent = (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem className="group" key={item.title}>
          {item.url ? (
            <SidebarMenuButton
              asChild
              className="group-hover:bg-black/10 dark:group-hover:bg-white/10"
            >
              <a href={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              className="group-hover:bg-black/10 dark:group-hover:bg-white/10"
              onClick={item.onClick}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  if (!asGroup) {
    return menuContent;
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>{menuContent}</SidebarGroupContent>
    </SidebarGroup>
  );
}
