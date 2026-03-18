'use client';

import { create } from 'zustand';
import type { Tables } from '@homecare/shared-types';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  organization: Tables<'organizations'> | null;
  setOrganization: (org: Tables<'organizations'> | null) => void;

  profile: Tables<'profiles'> | null;
  setProfile: (profile: Tables<'profiles'> | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  organization: null,
  setOrganization: (org) => set({ organization: org }),

  profile: null,
  setProfile: (profile) => set({ profile }),
}));
