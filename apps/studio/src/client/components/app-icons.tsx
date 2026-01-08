import { QuestsLogoIcon } from "@quests/components/logo";
import { type TabIconName } from "@quests/shared/icons";
import {
  CreditCard,
  FileText,
  FlaskConical,
  Globe,
  LayoutGrid,
  type LucideIcon,
  MessageCircle,
  SquareDashed,
  Telescope,
  Terminal,
} from "lucide-react";

export const IconMap: Record<TabIconName, LucideIcon> = {
  "credit-card": CreditCard,
  "file-text": FileText,
  "flask-conical": FlaskConical,
  globe: Globe,
  "layout-grid": LayoutGrid,
  "message-circle": MessageCircle,
  quests: QuestsLogoIcon,
  "square-dashed": SquareDashed,
  telescope: Telescope,
  terminal: Terminal,
} as const;
