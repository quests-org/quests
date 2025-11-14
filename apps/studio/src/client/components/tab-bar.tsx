import { Tab } from "@/client/components/tab";
import { useSelectedTabId, useTabActions, useTabs } from "@/client/hooks/tabs";
import { useRouter } from "@tanstack/react-router";
import { motion, Reorder } from "framer-motion";
import { Plus } from "lucide-react";

export default function TabBar() {
  const { addTab, closeTab, reorderTabs, selectTab } = useTabActions();
  const selectedTabId = useSelectedTabId();
  const tabs = useTabs();
  const router = useRouter();

  return (
    <div className="flex flex-row min-w-0 flex-1 overflow-hidden items-center">
      <Reorder.Group
        as="ul"
        axis="x"
        className="flex-nowrap flex justify-start items-center min-w-0 flex-1 [-webkit-app-region:drag]"
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
          className="titlebar-button flex items-center justify-center hover:bg-muted/60
            rounded-full h-6 w-6 ml-2 mr-2 shrink-0 [-webkit-app-region:no-drag]"
          onClick={() => {
            const location = router.buildLocation({
              to: "/new-tab",
            });
            void addTab({ urlPath: location.href });
          }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus className="size-4 opacity-90 hover:opacity-100 text-muted-foreground hover:text-foreground transition-colors" />
        </motion.button>
      </Reorder.Group>
    </div>
  );
}
