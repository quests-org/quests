import { AppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { cn } from "@/client/lib/utils";
import { type Tab as TabData } from "@/shared/tabs";
import { motion, Reorder } from "framer-motion";
import { X } from "lucide-react";

const SkeletonIcon = ({ isPinned = false }: { isPinned?: boolean }) => {
  return (
    <div
      className={cn(
        "size-5 shrink-0 rounded-full bg-muted",
        isPinned ? "mr-0" : "mr-1",
      )}
    />
  );
};

const SkeletonTitle = () => {
  return (
    <div className="min-w-0 flex-1">
      <div className="h-3 w-16 animate-pulse rounded bg-muted" />
    </div>
  );
};

interface Props {
  isSelected: boolean;
  item: TabData;
  onClick: () => void;
  onRemove: () => void;
  showSeparator: boolean;
}

export const Tab = ({ isSelected, item, onClick, onRemove }: Props) => {
  return (
    <Reorder.Item
      animate={{
        opacity: 1,
        transition: { duration: 0.1, ease: "easeInOut" },
        y: 0,
      }}
      className={cn(
        "group border-r border-border/50 [-webkit-app-region:no-drag]",
        isSelected ? "bg-background shadow-sm" : "hover:bg-muted/60",
        "min-w-0",
        item.pinned ? "px-3" : "w-full max-w-60 flex-1 pl-4",
        "relative flex h-svh items-center justify-between select-none",
      )}
      dragListener={!item.pinned}
      exit={{ opacity: 0, transition: { duration: 0.1 }, y: 20 }}
      id={item.id}
      initial={{
        opacity: 1,
        y: 0,
      }}
      onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button === 1) {
          // Close tab on middle click
          onRemove();
        } else {
          onClick();
        }
      }}
      title={item.title || ""}
      value={item}
    >
      <motion.div className="flex min-w-0 flex-1 items-center">
        <div className={cn(item.pinned ? "" : "mr-1.5")}>
          {item.iconName ? (
            <AppIcon isSelected={isSelected} name={item.iconName} size="sm" />
          ) : (
            <SkeletonIcon isPinned={item.pinned} />
          )}
        </div>
        {!item.pinned && (
          <>
            {item.title ? (
              <motion.span
                className={cn(
                  "flex-1 truncate text-xs font-semibold transition-colors",
                  isSelected
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {item.title}
              </motion.span>
            ) : (
              <SkeletonTitle />
            )}
          </>
        )}
      </motion.div>
      {!item.pinned && (
        <div className="flex items-center gap-1 pr-2 pl-1">
          <div className="group-hover:hidden">
            {item.projectSubdomain && !isSelected && (
              <AppStatusIcon
                className="size-4 shrink-0"
                subdomain={item.projectSubdomain}
              />
            )}
          </div>
          <button
            className="hidden rounded opacity-70 ring-offset-background transition-opacity group-hover:block hover:bg-muted hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <X
              className={cn(
                "size-4 transition-colors",
                isSelected ? "text-foreground" : "text-muted-foreground",
              )}
            />
          </button>
        </div>
      )}
    </Reorder.Item>
  );
};
