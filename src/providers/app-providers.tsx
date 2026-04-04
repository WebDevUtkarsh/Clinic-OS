"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthEventListener } from "@/features/auth/components/auth-event-listener";
import { createQueryClient } from "@/lib/query/query-client";
import { useUIStore } from "@/lib/store/ui-store";
import { ThemeProvider } from "@/providers/theme-provider";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    void useUIStore.persist.rehydrate();
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="clinic-os-theme"
    >
      <QueryClientProvider client={queryClient}>
        <AuthEventListener />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
