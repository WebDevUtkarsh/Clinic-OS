"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/components/SessionProvider";

type FacilityContextType = {
  facilityId: string | null;
  isActive: boolean;
};

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

export function FacilityProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isLoading } = useSession();

  // Extract facilityId from URL like /f/[facilityId]/...
  const match = pathname ? pathname.match(/^\/f\/([^/]+)/) : null;
  const facilityId = match ? match[1] : null;

  const isActive = Boolean(facilityId && (session?.facilityIds || []).includes(facilityId));

  useEffect(() => {
    if (isLoading || !session) return;

    if (facilityId && !(session.facilityIds || []).includes(facilityId)) {
      // User is trying to access a facility they don't have permission for
      router.replace("/onboarding");
    }
  }, [facilityId, session, isLoading, router]);

  return (
    <FacilityContext.Provider value={{ facilityId, isActive }}>
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  const context = useContext(FacilityContext);
  if (context === undefined) {
    throw new Error("useFacility must be used within a FacilityProvider");
  }
  return context;
}
