import {
  Breadcrumb,
  type BreadcrumbItem,
} from "@/client/components/breadcrumb";
import { DiscoverItemsGrid } from "@/client/components/discover-items-grid";

interface DiscoverPageLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  category: "apps" | "templates";
  description: string;
  items: { folderName: string }[];
  showHero?: boolean;
  showIcon?: boolean;
  title: string;
}

export function DiscoverPageLayout({
  breadcrumbs,
  category,
  description,
  items,
  showIcon = true,
  title,
}: DiscoverPageLayoutProps) {
  return (
    <div className="flex-1 mx-auto max-w-4xl">
      {breadcrumbs && (
        <div className="pt-8 pb-4 mb-4 px-8 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      <div className="px-8 pb-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="px-6 lg:px-8 mb-20">
        <DiscoverItemsGrid
          category={category}
          items={items}
          showIcon={showIcon}
        />
      </div>
    </div>
  );
}
