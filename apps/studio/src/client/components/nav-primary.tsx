import { InternalLink } from "@/client/components/internal-link";
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
    isWarning?: boolean;
    title: string;
    url: LinkProps["to"];
  }[];
}) {
  return (
    <SidebarGroup {...props} className="pl-1">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem className="group" key={item.title}>
              <SidebarMenuButton
                asChild
                className="group-hover:bg-black/10 data-[active=true]:bg-black/15 data-[active=true]:font-normal data-[active=true]:text-foreground dark:group-hover:bg-white/10 dark:data-[active=true]:bg-white/15"
                isActive={item.isActive}
              >
                <InternalLink
                  className={
                    item.isWarning
                      ? "text-warning-foreground [&>svg]:size-4 [&>svg]:text-warning-foreground"
                      : "[&>svg]:size-4"
                  }
                  openInCurrentTab
                  to={item.url}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </InternalLink>
              </SidebarMenuButton>
              {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
