"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isPublicRoute } from "@/lib/utils/routes";

export function useSessionGuard() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isPermitted, setIsPermitted] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      if (!isPublicRoute(pathname)) {
        router.replace("/login");
      } else {
        setIsPermitted(true);
      }
      return;
    }

    // Authenticated user routing
    if (session.requiresOrganizationSetup || session.requiresFacilitySetup) {
      if (!pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
        return;
      }
    } else {
      // User is fully onboarded; keep them out of auth/onboarding routes
      if (pathname.startsWith("/onboarding") || pathname === "/login" || pathname === "/register") {
        const facilityId = session.accessibleFacilityIds[0];
        if (facilityId) {
          router.replace(`/f/${facilityId}/dashboard`);
          return;
        }
      }
    }

    setIsPermitted(true);
  }, [session, isLoading, pathname, router]);

  return { isPermitted, isLoading };
}
