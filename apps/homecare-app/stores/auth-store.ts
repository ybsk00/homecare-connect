import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

type UserRole = 'guardian' | 'nurse' | 'doctor' | 'org_admin' | 'platform_admin';

interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string;
  avatar_url?: string | null;
}

interface StaffInfo {
  id: string;
  organization_id: string;
  staff_type: string;
  license_number?: string | null;
  specialties?: string[] | null;
  is_active: boolean;
  max_patients?: number | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  staffInfo: StaffInfo | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithKakao: () => Promise<{ error?: string; url?: string }>;
  signUp: (email: string, password: string, meta: { full_name: string; phone: string; role: UserRole }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  staffInfo: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ session, user: session.user });
        await get().fetchProfile();
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // 세션 변경 리스너
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        await get().fetchProfile();
      } else {
        set({ profile: null, staffInfo: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ isLoading: false });
    if (error) return { error: error.message };
    return {};
  },

  signInWithKakao: async () => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        skipBrowserRedirect: true,
      },
    });
    set({ isLoading: false });
    if (error) return { error: error.message };
    return { url: data.url };
  },

  signUp: async (email, password, meta) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    set({ isLoading: false });
    if (error) return { error: error.message };
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, staffInfo: null });
  },

  fetchProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    // 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, phone, avatar_url')
      .eq('id', userId)
      .single();

    console.log('[Auth] fetchProfile:', { userId, profile, profileError });

    if (profile) {
      set({ profile: profile as Profile });

      // 간호사/의사/기관관리자인 경우 staffInfo 조회
      if (['nurse', 'doctor', 'org_admin'].includes(profile.role)) {
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('id, organization_id, staff_type, license_number, specialties, is_active, max_patients')
          .eq('user_id', userId)
          .single();

        console.log('[Auth] staffInfo:', { staff, staffError });

        if (staff) {
          set({ staffInfo: staff as unknown as StaffInfo });
        }
      }
    } else {
      console.error('[Auth] Profile not found for userId:', userId);
    }
  },
}));
