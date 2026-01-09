import { QuestsLogoIcon } from "@quests/components/logo";
import { type TabIconName } from "@quests/shared/icons";
import {
  CreditCard,
  FileText,
  FlaskConical,
  Globe,
  type LucideIcon,
  MessageCircle,
  SquareDashed,
  TableProperties,
  Telescope,
  Terminal,
} from "lucide-react";

export const IconMap: Record<TabIconName, LucideIcon> = {
  "credit-card": CreditCard,
  "file-text": FileText,
  "flask-conical": FlaskConical,
  globe: Globe,
  "message-circle": MessageCircle,
  quests: QuestsLogoIcon,
  "square-dashed": SquareDashed,
  "table-properties": TableProperties,
  telescope: Telescope,
  terminal: Terminal,
} as const;
