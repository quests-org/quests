import { InternalLink } from "@/client/components/internal-link";
import { type LinkProps } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  to?: LinkProps["to"];
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {items.map((item, index) => (
        <div className="flex items-center space-x-1" key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {item.to ? (
            <InternalLink
              className="hover:text-foreground transition-colors"
              to={item.to}
            >
              {item.label}
            </InternalLink>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
