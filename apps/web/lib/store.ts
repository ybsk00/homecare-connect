import { create } from 'zustand';
import type { Tables } from '@homecare/shared-types';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  profile: Tables<'profiles'> | null;
  setProfile: (p: Tables<'profiles'> | null) => void;

  organization: Tables<'organizations'> | null;
  setOrganization: (o: Tables<'organizations'> | null) => void;

  staffInfo: {
    id: string;
    organization_id: string;
    license_number: string;
    staff_type: string;
    specialties: string[];
    is_active: boolean;
  } | null;
  setStaffInfo: (s: AppState['staffInfo']) => void;

  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  profile: null,
  setProfile: (p) => set({ profile: p }),

  organization: null,
  setOrganization: (o) => set({ organization: o }),

  staffInfo: null,
  setStaffInfo: (s) => set({ staffInfo: s }),

  selectedPatientId: null,
  setSelectedPatientId: (id) => set({ selectedPatientId: id }),
}));
