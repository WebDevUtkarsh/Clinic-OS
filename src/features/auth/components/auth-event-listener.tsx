"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { UNAUTHORIZED_EVENT } from "@/lib/api/client";
import { useUIStore } from "@/lib/store/ui-store";
import { isPublicRoute } from "@/lib/utils/routes";

export function AuthEventListener() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const resetUIState = useUIStore((state) => state.reset);

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.clear();
      resetUIState();

      if (!pathname || isPublicRoute(pathname)) {
        return;
      }

      router.replace("/login");
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [pathname, queryClient, resetUIState, router]);

  return null;
}
