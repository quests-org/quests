import { ThemeProvider } from "@/client/components/theme-provider";
import { cleanupPromptValueStorage } from "@/client/lib/cleanup-local-storage";
import { migrateSelectedModel } from "@/client/lib/migrate-selected-model";
import { queryClient, router } from "@/client/router";
import { QueryClientProvider } from "@tanstack/react-query";

import "./styles/app.css";

import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { TelemetryProvider } from "./providers/telemetry";

export function Main() {
  return (
    <TelemetryProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </TelemetryProvider>
  );
}

const rootElement = document.querySelector("#root");

if (rootElement && rootElement.innerHTML === "") {
  cleanupPromptValueStorage();
  void migrateSelectedModel();
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Main />);
}
