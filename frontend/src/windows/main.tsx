import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Root from "@/routes/__root.tsx";

// Create a React Query client
const queryClient = new QueryClient();

// Wait for the router to be ready before rendering
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Root />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
