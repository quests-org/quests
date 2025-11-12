import { SmallAppIcon } from "@/client/components/app-icon";
import { AppStatusIcon } from "@/client/components/app-status-icon";
import { TabIcon } from "@/client/components/tab-icon";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type Tab as TabData } from "@/shared/tabs";
import { AppSubdomainSchema } from "@quests/workspace/client";
import { skipToken, useQuery } from "@tanstack/react-query";
import { motion, Reorder } from "framer-motion";
import { X } from "lucide-react";

import { useMatchesForPathname } from "../lib/get-route-matches";

const SkeletonIcon = ({ isPinned = false }: { isPinned?: boolean }) => {
  return (
    <div
      className={cn(
        "size-5 shrink-0 bg-muted rounded-full",
        isPinned ? "mr-0" : "mr-1",
      )}
    />
  );
};

const SkeletonTitle = () => {
  return (
    <div className="flex-1 min-w-0">
      <div className="h-3 bg-muted rounded animate-pulse w-16" />
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
  const matches = useMatchesForPathname(item.pathname);

  const match = matches.find((m) => m.routeId === "/_app/projects/$subdomain/");

  const rawSubdomain = match?.params.subdomain.split("?")[0];
  const parsedSubdomainResult = rawSubdomain
    ? AppSubdomainSchema.safeParse(rawSubdomain)
    : undefined;

  const { data: appData } = useQuery(
    rpcClient.workspace.app.live.bySubdomain.experimental_liveOptions({
      enabled: !!parsedSubdomainResult?.success,
      input: parsedSubdomainResult?.data
        ? { subdomain: parsedSubdomainResult.data }
        : skipToken,
    }),
  );

  return (
    <Reorder.Item
      animate={{
        opacity: 1,
        transition: { duration: 0.1, ease: "easeInOut" },
        y: 0,
      }}
      className={cn(
        "[-webkit-app-region:no-drag] border-r border-border/50 group",
        isSelected ? "selected bg-background shadow-sm" : "hover:bg-muted/60",
        "titlebar-button min-w-0",
        item.pinned ? "px-3" : "max-w-60 w-full pl-4 flex-1",
        "relative h-svh flex justify-between items-center select-none",
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
      <motion.div className="flex items-center flex-1 min-w-0">
        <div className={item.pinned ? "" : "mr-2"}>
          {appData?.icon ? (
            <SmallAppIcon
              background={appData.icon.background}
              icon={appData.icon.lucide}
              size="sm"
            />
          ) : item.icon && item.background ? (
            <SmallAppIcon
              background={item.background}
              icon={item.icon}
              size="sm"
            />
          ) : item.icon ? (
            <TabIcon isSelected={isSelected} lucideIconName={item.icon} />
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
            {parsedSubdomainResult?.data && !isSelected && (
              <AppStatusIcon
                className="size-4 shrink-0"
                subdomain={parsedSubdomainResult.data}
              />
            )}
          </div>
          <button
            className="ring-offset-background focus:ring-ring rounded opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none hover:bg-muted hidden group-hover:block"
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
