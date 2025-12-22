import { Button } from "@/client/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import { cn } from "@/client/lib/utils";
import { type AgentName } from "@quests/workspace/client";
import {
  AppWindowMac,
  Check,
  ChevronDown,
  type LucideIcon,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";

interface AgentOption {
  displayName: string;
  icon: LucideIcon;
  value: AgentName;
}

const AGENT_OPTIONS: AgentOption[] = [
  {
    displayName: "Create App",
    icon: AppWindowMac,
    value: "app-builder",
  },
  {
    displayName: "Chat",
    icon: MessageCircle,
    value: "chat",
  },
];

export function AgentPicker({
  className = "",
  disabled = false,
  onChange,
  value,
}: {
  className?: string;
  disabled?: boolean;
  onChange?: (value: AgentName) => void;
  value?: AgentName;
}) {
  const [open, setOpen] = useState(false);
  const selectedAgent = AGENT_OPTIONS.find((agent) => agent.value === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "flex h-auto items-center justify-between px-1.5! py-1 text-left",
            "max-w-full",
            className,
          )}
          disabled={disabled}
          role="combobox"
          size="sm"
          variant="ghost"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {selectedAgent && (
              <>
                <selectedAgent.icon className="size-3 shrink-0 opacity-90" />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {selectedAgent.displayName}
                </span>
              </>
            )}
          </div>
          <ChevronDown className="size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-40 p-1">
        <div className="flex flex-col gap-0.5">
          {AGENT_OPTIONS.map((agent) => (
            <Button
              className={cn(
                "flex h-auto items-center justify-between gap-2 px-2 py-2 font-normal",
                value === agent.value && "bg-accent",
              )}
              key={agent.value}
              onClick={() => {
                onChange?.(agent.value);
                setOpen(false);
              }}
              size="sm"
              variant="ghost"
            >
              <div className="flex items-center gap-2">
                <agent.icon className="size-4 shrink-0" />
                <span className="text-sm">{agent.displayName}</span>
              </div>
              <Check
                className={cn(
                  "size-4 shrink-0",
                  value === agent.value ? "opacity-100" : "opacity-0",
                )}
              />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
