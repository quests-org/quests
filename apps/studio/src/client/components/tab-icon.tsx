import { IconMap } from "@/client/components/app-icons";
import { cn } from "@/client/lib/utils";
import { type IconName } from "@quests/shared/icons";
import { type LucideIcon } from "lucide-react";

export const TabIcon = ({
  isSelected = false,
  lucideIconName,
  themeColor,
}: {
  isSelected?: boolean;
  lucideIconName?: IconName;
  themeColor?: string;
}) => {
  if (!lucideIconName) {
    return null;
  }

  let Icon: LucideIcon | undefined;
  if (lucideIconName in IconMap) {
    Icon = IconMap[lucideIconName];
  }

  if (!Icon) {
    return null;
  }

  return (
    <Icon
      className={cn(
        "size-5 shrink-0 transition-colors",
        isSelected
          ? "text-foreground"
          : "text-muted-foreground group-hover:text-foreground",
      )}
      style={{
        color: themeColor,
      }}
    />
  );
};
