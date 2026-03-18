import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth() {
  const {
    session,
    user,
    profile,
    isLoading,
    isInitialized,
    initialize,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
  } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  return {
    session,
    user,
    profile,
    isLoading,
    isInitialized,
    isAuthenticated: !!session,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
  };
}
