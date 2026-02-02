import { Tab } from "@/client/components/tab";
import { useSelectedTabId } from "@/client/hooks/use-selected-tab-id";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { useTabs } from "@/client/hooks/use-tabs";
import { motion, Reorder } from "framer-motion";
import { Plus } from "lucide-react";

export default function TabBar() {
  const { addTab, closeTab, reorderTabs, selectTab } = useTabActions();
  const selectedTabId = useSelectedTabId();
  const tabs = useTabs();

  return (
    <div className="flex min-w-0 flex-1 flex-row items-center overflow-hidden">
      <Reorder.Group
        as="ul"
        axis="x"
        className="flex min-w-0 flex-1 flex-nowrap items-center justify-start [-webkit-app-region:drag]"
        onReorder={(values) => {
          // Extract only the IDs of non-pinned tabs for reordering
          const nonPinnedTabIds = values
            .filter((tab) => !tab.pinned)
            .map((tab) => tab.id);

          if (nonPinnedTabIds.length > 0) {
            void reorderTabs({ tabIds: nonPinnedTabIds });
          }
        }}
        values={tabs}
      >
        {tabs.map((item, index) => (
          <Tab
            isSelected={selectedTabId === item.id}
            item={item}
            key={item.id}
            onClick={() => {
              void selectTab({ id: item.id });
            }}
            onRemove={() => {
              void closeTab({ id: item.id });
            }}
            showSeparator={
              index !== tabs.findIndex((t) => t.id === selectedTabId) - 1 &&
              tabs.length > 2
            }
          />
        ))}
        <motion.button
          className="mx-2 flex size-6
             shrink-0 items-center justify-center rounded-full [-webkit-app-region:no-drag] hover:bg-muted/60"
          onClick={() => {
            void addTab({ to: "/new-tab" });
          }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus className="size-4 text-muted-foreground opacity-90 transition-colors hover:text-foreground hover:opacity-100" />
        </motion.button>
      </Reorder.Group>
    </div>
  );
}
