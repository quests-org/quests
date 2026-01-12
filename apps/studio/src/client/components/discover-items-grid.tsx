import { RegistryAppCard } from "@/client/components/registry-app-card";

interface DiscoverItemsGridProps {
  category: "apps" | "templates";
  items: { folderName: string }[];
}

export function DiscoverItemsGrid({ category, items }: DiscoverItemsGridProps) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto max-w-md">
          <svg
            className="mx-auto h-16 w-16 text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
            />
          </svg>
          <h3 className="mt-6 text-xl font-semibold text-foreground">
            No items available yet
          </h3>
          <p className="mt-2 text-muted-foreground">
            Starter applications and templates will appear here when they become
            available in your workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
      {items.map((item) => (
        <RegistryAppCard
          category={category}
          folderName={item.folderName}
          key={item.folderName}
        />
      ))}
    </div>
  );
}
