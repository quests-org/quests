import { SidebarLink } from "@/client/components/sidebar-link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/client/components/ui/sidebar";
import { type LinkProps } from "@tanstack/react-router";
import { type LucideIcon } from "lucide-react";
import React from "react";

export function NavPrimary({
  items,
  ...props
}: React.ComponentPropsWithoutRef<typeof SidebarGroup> & {
  items: {
    badge?: React.ReactNode;
    icon: LucideIcon;
    isActive?: boolean;
    title: string;
    url: LinkProps["to"];
  }[];
}) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem className="group" key={item.title}>
              <SidebarMenuButton
                asChild
                className="group-hover:bg-black/10 dark:group-hover:bg-white/10"
                isActive={item.isActive}
              >
                <SidebarLink className="[&>svg]:size-5" to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarLink>
              </SidebarMenuButton>
              {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
