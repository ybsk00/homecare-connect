import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Loading } from '@/components/ui/Loading';

export default function Index() {
  const { isAuthenticated, isInitialized, staffInfo } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    } else if (!staffInfo) {
      // 간호사 정보가 없으면 면허 인증 화면으로
      router.replace('/(auth)/verify');
    } else {
      router.replace('/(tabs)/today');
    }
  }, [isAuthenticated, isInitialized, staffInfo]);

  return <Loading message="로딩 중..." />;
}
