"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UIState = {
  activeFacilityId: string | null;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isInsightsOpen: boolean;
  hasHydrated: boolean;
  setActiveFacilityId: (facilityId: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setInsightsOpen: (open: boolean) => void;
  toggleInsightsOpen: () => void;
  markHydrated: () => void;
  reset: () => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeFacilityId: null,
      isSidebarOpen: false,
      isSidebarCollapsed: false,
      isInsightsOpen: false,
      hasHydrated: false,
      setActiveFacilityId: (activeFacilityId) => set({ activeFacilityId }),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setInsightsOpen: (isInsightsOpen) => set({ isInsightsOpen }),
      toggleInsightsOpen: () =>
        set((state) => ({ isInsightsOpen: !state.isInsightsOpen })),
      markHydrated: () => set({ hasHydrated: true }),
      reset: () =>
        set({
          activeFacilityId: null,
          isSidebarOpen: false,
          isInsightsOpen: false,
        }),
    }),
    {
      name: "clinicos-ui",
      partialize: (state) => ({
        activeFacilityId: state.activeFacilityId,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);
