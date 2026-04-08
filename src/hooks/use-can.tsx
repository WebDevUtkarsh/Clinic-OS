"use client";

import { useSession } from "@/features/auth/components/SessionProvider";
import { ReactNode } from "react";

export function useCan(permission: string): boolean {
  const { session, isLoading } = useSession();

  if (isLoading || !session) return false;

  return (session.permissions || []).includes(permission);
}

export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const isAllowed = useCan(permission);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
