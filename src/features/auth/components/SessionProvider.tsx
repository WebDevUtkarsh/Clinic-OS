"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, ApiClientError } from "@/lib/api/client";
import { useRouter, usePathname } from "next/navigation";
import { isPublicRoute } from "@/lib/utils/routes";

import { SessionData, TenantStatus } from "@/features/auth/types";

type SessionContextType = {
  session: SessionData | null;
  isLoading: boolean;
  error: Error | null;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ success: boolean; data: SessionData }>("/auth/me");
        return data.data;
      } catch (err: unknown) {
        if (err instanceof ApiClientError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, 
    retry: false,
  });

  const value = {
    session: session ?? null,
    isLoading,
    error: error as Error | null,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
