import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
  const {
    session,
    profile,
    staffInfo,
    isLoading,
    isInitialized,
    setSession,
    setProfile,
    setStaffInfo,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore();

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // 간호사 staff 정보 조회
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (!staffError && staffData) {
          setStaffInfo({
            id: staffData.id,
            orgId: staffData.org_id,
            staffType: staffData.staff_type,
            licenseNumber: staffData.license_number,
            specialties: staffData.specialties,
            maxPatients: staffData.max_patients,
            currentPatientCount: staffData.current_patient_count,
            isActive: staffData.is_active,
          });
        }
      } catch (error) {
        console.error('프로필 로드 실패:', error);
      }
    },
    [setProfile, setStaffInfo],
  );

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession);
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error('세션 초기화 실패:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setStaffInfo(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, setSession, setProfile, setStaffInfo, setLoading, setInitialized]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : '로그인에 실패했습니다.';
        Alert.alert('로그인 실패', message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      reset();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  }, [reset]);

  return {
    session,
    profile,
    staffInfo,
    isLoading,
    isInitialized,
    isAuthenticated: !!session,
    userId: session?.user?.id ?? null,
    signIn,
    signOut,
  };
}
