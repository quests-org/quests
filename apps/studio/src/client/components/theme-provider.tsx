import { rpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

interface ThemeProviderState {
  setTheme: (theme: Theme) => void;
  theme: Theme;
}

const initialState: ThemeProviderState = {
  setTheme: () => null,
  theme: "system",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  ...props
}: ThemeProviderProps) {
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );

  const setThemeMutation = useMutation(
    rpcClient.preferences.setTheme.mutationOptions(),
  );

  const theme = preferences?.theme || defaultTheme;

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      // set the initial theme based on the system preference
      const queryMedia = window.matchMedia("(prefers-color-scheme: dark)");
      const systemTheme = queryMedia.matches ? "dark" : "light";
      root.classList.add(systemTheme);

      // listen for changes to the system theme
      const listener = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };
      queryMedia.addEventListener("change", listener);
      return () => {
        queryMedia.removeEventListener("change", listener);
      };
    }

    root.classList.add(theme);
    return;
  }, [theme]);

  const value = {
    setTheme: (t: Theme) => {
      setThemeMutation.mutate({ theme: t });
    },
    theme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
