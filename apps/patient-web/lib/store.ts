'use client';

import { create } from 'zustand';
import type { Tables } from '@homecare/shared-types';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  profile: Tables<'profiles'> | null;
  setProfile: (profile: Tables<'profiles'> | null) => void;

  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  profile: null,
  setProfile: (profile) => set({ profile }),

  selectedPatientId: null,
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
}));
