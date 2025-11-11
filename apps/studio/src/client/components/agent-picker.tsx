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
    value: "code",
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
  onValueChange,
  value = "code",
}: {
  className?: string;
  disabled?: boolean;
  onValueChange: (value: AgentName) => void;
  value: AgentName;
}) {
  const [open, setOpen] = useState(false);
  const selectedAgent = AGENT_OPTIONS.find((agent) => agent.value === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            "flex items-center justify-between text-left h-auto py-1 px-1.5!",
            "max-w-full",
            className,
          )}
          disabled={disabled}
          role="combobox"
          size="sm"
          variant="ghost"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {selectedAgent && (
              <>
                <selectedAgent.icon className="size-3 shrink-0 opacity-90" />
                <span className="truncate text-xs min-w-0 flex-1">
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
                "flex items-center justify-between gap-2 h-auto py-2 px-2 font-normal",
                value === agent.value && "bg-accent",
              )}
              key={agent.value}
              onClick={() => {
                onValueChange(agent.value);
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
