import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '@homecare/shared-types';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Tables<'profiles'> | null;
  isLoading: boolean;
  isInitialized: boolean;
  _authUnsubscribe: (() => void) | null;

  initialize: () => Promise<void>;
  cleanup: () => void;
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Tables<'profiles'>>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  _authUnsubscribe: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null });

      if (session?.user) {
        await get().fetchProfile();
      }

      // 세션 변경 리스너 - 기존 구독 해제 후 새로 구독
      const existingUnsubscribe = get()._authUnsubscribe;
      if (existingUnsubscribe) {
        existingUnsubscribe();
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
        if (session?.user) {
          get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });

      set({ _authUnsubscribe: () => subscription.unsubscribe() });
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  cleanup: () => {
    const unsubscribe = get()._authUnsubscribe;
    if (unsubscribe) {
      unsubscribe();
      set({ _authUnsubscribe: null });
    }
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      set({ profile: data });
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user });
      await get().fetchProfile();
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email, password, fullName, phone) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;

      if (data.user) {
        // 프로필 생성
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          role: 'guardian',
          full_name: fullName,
          phone,
        });
        if (profileError) throw profileError;

        set({ session: data.session, user: data.user });
        await get().fetchProfile();
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    set({ profile: data });
  },
}));
