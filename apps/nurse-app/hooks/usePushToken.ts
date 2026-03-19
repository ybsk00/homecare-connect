import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { upsertPushToken, deactivatePushToken } from '@homecare/supabase-client';
import { useAuthStore } from '@/stores/auth-store';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('푸시 알림 권한이 거부되었습니다.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.error('푸시 토큰 획득 실패:', error);
    return null;
  }
}

export function usePushTokenRegistration() {
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!session?.user?.id) return;

    let pushToken: string | null = null;

    const register = async () => {
      try {
        const token = await registerForPushNotifications();
        if (!token) return;

        pushToken = token;
        const deviceType: 'ios' | 'android' =
          Platform.OS === 'ios' ? 'ios' : 'android';

        await upsertPushToken(supabase, session.user.id, token, deviceType);
        console.log('푸시 토큰 등록 완료:', token.substring(0, 20) + '...');
      } catch (error) {
        console.error('푸시 토큰 등록 실패:', error);
      }
    };

    register();

    return () => {
      // 클린업 시 토큰 비활성화 (로그아웃 등)
      if (pushToken && session?.user?.id) {
        deactivatePushToken(supabase, session.user.id, pushToken).catch(
          (error) => console.error('푸시 토큰 비활성화 실패:', error),
        );
      }
    };
  }, [session?.user?.id]);
}
