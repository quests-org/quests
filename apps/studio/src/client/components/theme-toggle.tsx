import { useTheme } from "@/client/components/theme-provider";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case "dark": {
        return <Moon className="size-4" />;
      }
      case "light": {
        return <Sun className="size-4" />;
      }
      case "system": {
        return <Monitor className="size-4" />;
      }
      default: {
        return <Sun className="size-4" />;
      }
    }
  };

  const getThemeName = () => {
    switch (theme) {
      case "dark": {
        return "Dark";
      }
      case "light": {
        return "Light";
      }
      case "system": {
        return "System";
      }
      default: {
        return "Light";
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" variant="outline">
          {getThemeIcon()}
          {getThemeName()}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setTheme("light");
          }}
        >
          <Sun className="mr-2 size-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme("dark");
          }}
        >
          <Moon className="mr-2 size-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme("system");
          }}
        >
          <Monitor className="mr-2 size-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
