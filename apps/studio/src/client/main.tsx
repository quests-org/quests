import { ThemeProvider } from "@/client/components/theme-provider";
import { queryClient, router } from "@/client/router";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import "./styles/app.css";

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
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Main />);
}
