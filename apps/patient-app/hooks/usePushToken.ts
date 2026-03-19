import { useEffect, useRef } from 'react';
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

async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.error('푸시 알림 권한이 거부되었습니다');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.error('푸시 토큰 등록 오류:', error);
    return null;
  }
}

export function usePushTokenRegistration() {
  const user = useAuthStore((s) => s.user);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      // 로그아웃 시 토큰 비활성화
      if (tokenRef.current) {
        const token = tokenRef.current;
        tokenRef.current = null;
        // user가 없으므로 이전 user ID로 비활성화할 수 없음
        // 로그아웃 전에 처리해야 함
      }
      return;
    }

    let isMounted = true;

    async function register() {
      try {
        const token = await registerForPushNotificationsAsync();
        if (!isMounted || !token) return;

        tokenRef.current = token;
        const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
        await upsertPushToken(supabase, user!.id, token, deviceType as 'ios' | 'android');
      } catch (error) {
        console.error('푸시 토큰 등록 실패:', error);
      }
    }

    register();

    return () => {
      isMounted = false;
      // 언마운트 시 토큰 비활성화
      if (tokenRef.current && user) {
        deactivatePushToken(supabase, user.id, tokenRef.current).catch((error) => {
          console.error('푸시 토큰 비활성화 실패:', error);
        });
      }
    };
  }, [user]);
}
