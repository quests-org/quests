import { type IconName as LucideIconName } from "lucide-react/dynamic";
import { z } from "zod";

type CustomIconName = "quests";

export const SELECTABLE_APP_ICONS = [
  "library",
  "activity",
  "alarm-clock",
  "app-window-mac",
  "app-window",
  "barcode",
  "battery-full",
  "bell",
  "bookmark",
  "box",
  "briefcase",
  "calculator",
  "calendar",
  "camera",
  "chart-bar",
  "chart-line",
  "chart-pie",
  "check",
  "clipboard",
  "cloud-download",
  "cloud-upload",
  "cloud",
  "cog",
  "compass",
  "credit-card",
  "crown",
  "download",
  "edit",
  "file",
  "file-stack",
  "flashlight",
  "folder",
  "globe-lock",
  "globe",
  "grid",
  "heart",
  "home",
  "layout-dashboard",
  "layout-grid",
  "list",
  "lock",
  "log-in",
  "log-out",
  "mail",
  "map-plus",
  "map-pin",
  "map",
  "menu",
  "message-circle",
  "message-square",
  "monitor",
  "moon",
  "package",
  "panels-top-left",
  "pen",
  "pencil",
  "phone",
  "search",
  "settings",
  "shopping-cart",
  "smartphone",
  "sparkles",
  "star",
  "sun",
  "tablet",
  "terminal",
  "tv",
  "unlock",
  "upload",
  "user-check",
  "user-cog",
  "user-lock",
  "user-plus",
  "user-round-plus",
  "user-round",
  "user-search",
  "user",
  "users",
  "view",
  "wallet",
  "wifi",
  "zap",
] as const satisfies (CustomIconName | LucideIconName)[];

export const SelectableAppIconsSchema = z.enum(SELECTABLE_APP_ICONS);

export const APP_ICONS = [
  ...SELECTABLE_APP_ICONS,
  "scan", // Removed, but for backwards compatibility
  "x", // Removed, but for backwards compatibility
  "square-dashed", // The default, but not selectable
  "quests",
  "file-text",
] as const satisfies (CustomIconName | LucideIconName)[];

export const AppIconsSchema = z.enum(APP_ICONS);

export type IconName = (typeof APP_ICONS)[number];
export type SelectableIconName = (typeof SELECTABLE_APP_ICONS)[number];

const THEME_GRADIENTS = {
  blue: "conic-gradient(from 42deg at 50% 50%, #0d84ff, #5856d7)",
  cyan: "conic-gradient(from 42deg at 50% 50%, #6ac4dc, #55bef0)",
  green: "conic-gradient(from 42deg at 50% 50%, #32d74b, #00c7be)",
  orange: "conic-gradient(from 42deg at 50% 50%, #ff9f0b, #ffcc01)",
  pink: "conic-gradient(from 42deg at 50% 50%, #bf5af2, #ff2c55)",
  placeholder: "#525252",
  purple: "conic-gradient(from 42deg at 50% 50%, #5e5ce6, #af53de)",
  red: "conic-gradient(from 42deg at 50% 50%, #fe453a, #ff9502)",
  rose: "conic-gradient(from 42deg at 50% 50%, #ff375f, #fe453a)",
  sky: "conic-gradient(from 42deg at 50% 50%, #59c8f5, #027aff)",
  teal: "conic-gradient(from 42deg at 50% 50%, #66d4cf, #59adc4)",
  yellow: "conic-gradient(from 42deg at 50% 50%, #ffd60a, #26cd41)",
  zinc: "conic-gradient(from 42deg at 50% 50%, #18181b, #27272a)",
};

export const THEMES = Object.values(THEME_GRADIENTS);

export const DEFAULT_THEME_GRADIENT = THEME_GRADIENTS.zinc;
export const DEFAULT_LUCIDE_APP_ICON = "square-dashed";

export const AppThemesSchema = z.enum(THEMES);

export const ICON_DEFAULT: IconName = "box";
