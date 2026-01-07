import { IconMap } from "@/client/components/app-icons";
import { type ProjectMode } from "@quests/shared";
import { DEFAULT_THEME_GRADIENT, type IconName } from "@quests/shared/icons";
import { tv, type VariantProps } from "tailwind-variants";

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

const smallAppIconVariants = tv({
  defaultVariants: {
    overflow: "hidden",
    size: "sm",
  },
  slots: {
    badge:
      "absolute right-0 bottom-0 z-20 text-white drop-shadow-md not-dark:fill-secondary not-dark:text-secondary-foreground",
    chat: "shrink-0 text-muted-foreground",
    container:
      "relative flex shrink-0 items-center justify-center rounded-full shadow-md",
    icon: "relative z-10 text-white drop-shadow-md",
  },
  variants: {
    overflow: {
      hidden: {
        container: "overflow-hidden",
      },
      visible: {
        container: "overflow-visible",
      },
    },
    size: {
      lg: {
        badge: "size-4",
        chat: "size-7",
        container: "size-7",
        icon: "size-4.5",
      },
      md: {
        badge: "size-3",
        chat: "size-5",
        container: "size-6",
        icon: "size-4",
      },
      sm: {
        badge: "size-2.5",
        chat: "mx-0.5 size-4",
        container: "size-5",
        icon: "size-3",
      },
      xl: {
        badge: "size-5",
        chat: "size-9",
        container: "size-9",
        icon: "size-5",
      },
      xs: {
        badge: "size-2",
        chat: "size-3",
        container: "size-4",
        icon: "size-2",
      },
    },
  },
});

export function SmallAppIcon({
  background,
  mode,
  // eslint-disable-next-line perfectionist/sort-objects
  icon = DEFAULT_LUCIDE_ICON_MAP[mode],
  size = "sm",
}: VariantProps<typeof smallAppIconVariants> & {
  background?: string;
  icon?: IconName;
  mode: ProjectMode;
}) {
  const finalBackground = background || DEFAULT_THEME_GRADIENT;
  const FlaskIcon = IconMap["flask-conical"];
  const {
    badge,
    chat,
    container,
    icon: iconClass,
  } = smallAppIconVariants({
    overflow: mode === "eval" ? "visible" : "hidden",
    size,
  });

  if (mode === "chat") {
    const IconComponent = IconMap[icon];
    return <IconComponent className={chat()} />;
  }

  const IconComponent = IconMap[icon];
  return (
    <div
      className={container()}
      style={{
        background: finalBackground,
      }}
    >
      <IconComponent className={iconClass()} />
      {mode === "eval" && (
        <FlaskIcon
          className={badge()}
          style={{
            transform: "translate(25%, 25%)",
          }}
        />
      )}
    </div>
  );
}
