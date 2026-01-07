import { IconMap } from "@/client/components/app-icons";
import { cn } from "@/client/lib/utils";
import { type ProjectMode } from "@quests/shared";
import { DEFAULT_THEME_GRADIENT, type IconName } from "@quests/shared/icons";
import { cva, type VariantProps } from "class-variance-authority";

const DEFAULT_LUCIDE_ICON_MAP: Record<ProjectMode, IconName> = {
  "app-builder": "square-dashed",
  chat: "message-circle",
  eval: "flask-conical",
};

export function AppIcon({
  background = DEFAULT_THEME_GRADIENT,
  icon,
}: {
  background?: string;
  icon?: IconName;
}) {
  const IconComponent = icon
    ? IconMap[icon]
    : IconMap[DEFAULT_LUCIDE_ICON_MAP["app-builder"]];

  return (
    <div
      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md"
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
      <IconComponent className="relative z-10 h-6 w-6 text-white drop-shadow-md" />
    </div>
  );
}

export function SmallAppIcon({
  background,
  mode,
  // eslint-disable-next-line perfectionist/sort-objects
  icon = DEFAULT_LUCIDE_ICON_MAP[mode],
  size = "sm",
}: {
  background?: string;
  icon?: IconName;
  mode: ProjectMode;
  size?: "lg" | "md" | "sm" | "xl" | "xs";
}) {
  const finalBackground = background || DEFAULT_THEME_GRADIENT;
  const FlaskIcon = IconMap["flask-conical"];

  if (mode === "chat") {
    const IconComponent = IconMap[icon];
    return (
      <IconComponent
        className={cn(
          "shrink-0 text-muted-foreground",
          size === "xs" && "size-3",
          size === "sm" && "mx-0.5 size-4", // Align with app icons
          size === "md" && "size-5",
          size === "lg" && "size-7",
          size === "xl" && "size-9",
        )}
      />
    );
  }

  const IconComponent = IconMap[icon];
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full shadow-md",
        mode === "eval" ? "overflow-visible" : "overflow-hidden",
        size === "xs" && "size-4",
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
          "relative z-10 text-white drop-shadow-md",
          size === "sm" && "size-3",
          size === "sm" && "size-3",
          size === "md" && "size-4",
          size === "lg" && "size-4.5",
          size === "xl" && "size-5",
        )}
      />
      {mode === "eval" && (
        <FlaskIcon
          className={cn(
            "absolute right-0 bottom-0 z-20 text-white drop-shadow-md not-dark:fill-secondary not-dark:text-secondary-foreground",
            size === "xs" && "size-2",
            size === "sm" && "size-2.5",
            size === "md" && "size-3",
            size === "lg" && "size-4",
            size === "xl" && "size-5",
          )}
          style={{
            transform: "translate(25%, 25%)",
          }}
        />
      )}
    </div>
  );
}
