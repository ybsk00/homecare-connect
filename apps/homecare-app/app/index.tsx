import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, FontSize } from '@/constants/theme';

export default function EntryScreen() {
  const { isInitialized, isLoading, user, profile } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    if (!profile) return;

    // 역할별 분기
    switch (profile.role) {
      case 'guardian':
        router.replace('/(patient)/home');
        break;
      case 'nurse':
      case 'doctor':
        router.replace('/(nurse)/today');
        break;
      case 'org_admin':
        router.replace('/(hospital)/dashboard');
        break;
      case 'platform_admin':
        router.replace('/(admin)/kpi');
        break;
      default:
        router.replace('/(auth)/login');
    }
  }, [isInitialized, isLoading, user, profile]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>홈케어커넥트</Text>
      <Text style={styles.subtitle}>방문치료 매칭 플랫폼</Text>
      <ActivityIndicator size="large" color={Colors.secondary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  logo: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 8,
  },
  spinner: {
    marginTop: 32,
  },
});
