import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { colors } from '@/constants/theme';

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
              animation: 'slide_from_right',
              headerStyle: {
                backgroundColor: colors.surface,
              },
              headerTintColor: colors.primary,
              headerTitleStyle: {
                fontWeight: '700',
                fontSize: 18,
                color: colors.onSurface,
              },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="matching/request"
              options={{ headerShown: true, title: '매칭 요청', headerBackTitle: '뒤로' }}
            />
            <Stack.Screen
              name="matching/results"
              options={{ headerShown: true, title: '매칭 결과', headerBackTitle: '뒤로' }}
            />
            <Stack.Screen
              name="matching/[orgId]"
              options={{ headerShown: true, title: '기관 상세', headerBackTitle: '뒤로' }}
            />
            <Stack.Screen
              name="patient/register"
              options={{ headerShown: true, title: '환자 등록', headerBackTitle: '뒤로' }}
            />
            <Stack.Screen
              name="patient/[patientId]"
              options={{ headerShown: true, title: '환자 프로필', headerBackTitle: '뒤로' }}
            />
            <Stack.Screen
              name="visit/[visitId]"
              options={{ headerShown: true, title: '방문 상세', headerBackTitle: '뒤로' }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: true, title: '알림', headerBackTitle: '뒤로' }}
            />
            <Stack.Screen
              name="chat/index"
              options={{ headerShown: true, title: 'AI 상담', headerBackTitle: '뒤로' }}
            />
          </Stack>
        </AuthInitializer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
