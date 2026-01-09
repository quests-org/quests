import { type IconName as LucideIconName } from "lucide-react/dynamic";
import { z } from "zod";

type CustomIconName = "quests";

const TAB_ICONS = [
  "credit-card",
  "file-text",
  "flask-conical",
  "globe",
  "table-properties",
  "quests",
  "message-circle",
  "square-dashed",
  "telescope",
  "terminal",
] as const satisfies (CustomIconName | LucideIconName)[];

export const TabIconsSchema = z.enum(TAB_ICONS);

export type TabIconName = (typeof TAB_ICONS)[number];
