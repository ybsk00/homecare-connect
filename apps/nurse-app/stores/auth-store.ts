import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Tables } from '@homecare/shared-types';

interface StaffInfo {
  id: string;
  orgId: string;
  staffType: string;
  licenseNumber: string | null;
  specialties: string[];
  maxPatients: number;
  currentPatientCount: number;
  isActive: boolean;
}

interface AuthState {
  session: Session | null;
  profile: Tables<'profiles'> | null;
  staffInfo: StaffInfo | null;
  isLoading: boolean;
  isInitialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Tables<'profiles'> | null) => void;
  setStaffInfo: (info: StaffInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  staffInfo: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setStaffInfo: (info) => set({ staffInfo: info }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  reset: () =>
    set({
      session: null,
      profile: null,
      staffInfo: null,
      isLoading: false,
    }),
}));
