import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.surface },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(patient)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(nurse)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(hospital)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(admin)" options={{ animation: 'fade' }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
