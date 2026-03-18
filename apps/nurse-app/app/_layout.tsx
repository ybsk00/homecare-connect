import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Colors, Spacing, FontSize } from '@/constants/theme';

function OfflineBanner() {
  const { isOnline, pendingSyncCount, isSyncing, syncProgress } = useOfflineSync();

  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <View
      style={[
        styles.banner,
        !isOnline ? styles.offlineBanner : styles.syncBanner,
      ]}
    >
      {!isOnline ? (
        <Text style={styles.bannerText}>
          {'\uC624\uD504\uB77C\uC778 \uBAA8\uB4DC \u2014 \uAE30\uB85D\uC740 \uC800\uC7A5\uB429\uB2C8\uB2E4'}
        </Text>
      ) : isSyncing && syncProgress ? (
        <Text style={styles.bannerText}>
          {'\uB3D9\uAE30\uD654 \uC911...'} ({syncProgress.synced}/{syncProgress.total})
        </Text>
      ) : pendingSyncCount > 0 ? (
        <Text style={styles.bannerText}>
          {'\uB3D9\uAE30\uD654 \uB300\uAE30'} {pendingSyncCount}{'\uAC74'}
        </Text>
      ) : null}
    </View>
  );
}

function RootLayoutInner() {
  return (
    <>
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.onSurface,
          headerTitleStyle: { fontWeight: '700', color: Colors.onSurface },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.surface },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="visit/[visitId]/index"
          options={{ title: '\uBC29\uBB38 \uC0C1\uC138' }}
        />
        <Stack.Screen
          name="visit/[visitId]/checkin"
          options={{ title: '\uCCB4\uD06C\uC778' }}
        />
        <Stack.Screen
          name="visit/[visitId]/vitals"
          options={{ title: '\uBC14\uC774\uD0C8 \uC0AC\uC778' }}
        />
        <Stack.Screen
          name="visit/[visitId]/checklist"
          options={{ title: '\uC218\uD589 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8' }}
        />
        <Stack.Screen
          name="visit/[visitId]/memo"
          options={{ title: '\uBA54\uBAA8 \uBC0F \uAE30\uB85D' }}
        />
        <Stack.Screen
          name="visit/[visitId]/checkout"
          options={{ title: '\uCCB4\uD06C\uC544\uC6C3' }}
        />
        <Stack.Screen
          name="route/index"
          options={{ title: '\uB3D9\uC120 \uCD5C\uC801\uD654' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: Colors.offline.banner,
  },
  syncBanner: {
    backgroundColor: Colors.primary,
  },
  bannerText: {
    fontSize: FontSize.sm,
    color: Colors.offline.bannerText,
    fontWeight: '600',
  },
});
