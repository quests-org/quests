import { IconMap } from "@/client/components/app-icons";
import { cn } from "@/client/lib/utils";
import {
  DEFAULT_LUCIDE_APP_ICON,
  DEFAULT_THEME_GRADIENT,
  type IconName,
} from "@quests/shared/icons";

export function AppIcon({
  background = DEFAULT_THEME_GRADIENT,
  icon = DEFAULT_LUCIDE_APP_ICON,
}: {
  background?: string;
  icon?: IconName;
}) {
  const IconComponent = IconMap[icon];

  return (
    <div
      className="rounded-full relative flex items-center justify-center shrink-0 h-12 w-12 shadow-md overflow-hidden"
      style={{
        background,
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(135deg,
                    rgba(255, 255, 255, 0.25) 0%,
                    rgba(255, 255, 255, 0.1) 25%,
                    rgba(255, 255, 255, 0.05) 50%,
                    rgba(0, 0, 0, 0.1) 75%,
                    rgba(0, 0, 0, 0.25) 100%)`,
          pointerEvents: "none",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(ellipse at 30% 20%,
                    rgba(255, 255, 255, 0.3) 0%,
                    rgba(255, 255, 255, 0.1) 40%,
                    transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <IconComponent className="h-6 w-6 text-white drop-shadow-md relative z-10" />
    </div>
  );
}

export function SmallAppIcon({
  background,
  icon,
  size = "sm",
  variant,
}: {
  background?: string;
  icon?: IconName;
  size?: "lg" | "md" | "sm" | "xl";
  variant?: "app" | "chat";
}) {
  const shouldShowIcon = icon || variant;

  if (!shouldShowIcon) {
    return null;
  }

  const finalIcon =
    icon || (variant === "chat" ? "message-circle" : DEFAULT_LUCIDE_APP_ICON);
  const finalBackground = background || DEFAULT_THEME_GRADIENT;
  const IconComponent = IconMap[finalIcon];

  return (
    <div
      className={cn(
        "rounded-full relative flex items-center justify-center shrink-0 shadow-md overflow-hidden",
        size === "sm" && "size-5",
        size === "md" && "size-6",
        size === "lg" && "size-7",
        size === "xl" && "size-9",
      )}
      style={{
        background: finalBackground,
      }}
    >
      <IconComponent
        className={cn(
          "text-white drop-shadow-md relative z-10",
          size === "sm" && "size-3",
          size === "md" && "size-4",
          size === "lg" && "size-[1.125rem]",
          size === "xl" && "size-5",
        )}
      />
    </div>
  );
}
