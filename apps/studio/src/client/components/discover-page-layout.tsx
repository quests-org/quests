import {
  Breadcrumb,
  type BreadcrumbItem,
} from "@/client/components/breadcrumb";
import { DiscoverItemsGrid } from "@/client/components/discover-items-grid";

interface DiscoverPageLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  category: "templates";
  description: string;
  items: { folderName: string }[];
  showHero?: boolean;
  title: string;
}

export function DiscoverPageLayout({
  breadcrumbs,
  category,
  description,
  items,
  title,
}: DiscoverPageLayoutProps) {
  return (
    <div className="mx-auto max-w-4xl flex-1">
      {breadcrumbs && (
        <div className="sticky top-0 z-10 mb-4 bg-background/95 px-8 pt-8 pb-4 backdrop-blur supports-backdrop-filter:bg-background/60">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      <div className="px-8 pb-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mb-20 px-6 lg:px-8">
        <DiscoverItemsGrid category={category} items={items} />
      </div>
    </div>
  );
}
