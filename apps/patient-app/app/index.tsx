import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Loading } from '@/components/ui/Loading';

export default function IndexScreen() {
  const router = useRouter();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!isInitialized) return;

    if (session) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isInitialized, session, router]);

  return <Loading fullScreen message="홈케어커넥트 로딩 중..." />;
}
