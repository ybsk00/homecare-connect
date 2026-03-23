import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import {
  Database,
  Bot,
  Settings,
  LogOut,
  ChevronRight,
  User,
  Shield,
} from '@/components/icons/TabIcons';

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  sublabel: string;
  onPress: () => void;
  color?: string;
}

export default function AdminMore() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuthStore();

  const menuItems: MenuItem[] = [
    {
      icon: Database,
      label: 'RAG 관리',
      sublabel: 'AI 지식베이스 및 대화 로그',
      onPress: () => router.push('/admin/rag'),
    },
    {
      icon: Bot,
      label: 'AI 모니터링',
      sublabel: 'AI 매칭, 레드플래그 모니터링',
      onPress: () => router.push('/admin/monitoring'),
    },
    {
      icon: Shield,
      label: '보안 설정',
      sublabel: '접근 권한 및 보안 정책',
      onPress: () => {},
    },
    {
      icon: Settings,
      label: '설정',
      sublabel: '플랫폼 운영 설정',
      onPress: () => {},
    },
  ];

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* 프로필 카드 */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <User color={Colors.onPrimary} size={28} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name ?? '관리자'}</Text>
          <Text style={styles.profileRole}>플랫폼 관리자</Text>
          <Text style={styles.profilePhone}>{profile?.phone ?? ''}</Text>
        </View>
      </View>

      {/* 메뉴 리스트 */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>관리 도구</Text>
        {menuItems.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={idx}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: `${Colors.secondary}10` }]}>
                <IconComp color={item.color ?? Colors.secondary} size={20} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSublabel}>{item.sublabel}</Text>
              </View>
              <ChevronRight color={Colors.outlineVariant} size={18} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 시스템 정보 */}
      <View style={styles.infoSection}>
        <Text style={styles.menuSectionTitle}>시스템 정보</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>플랫폼 버전</Text>
            <Text style={styles.infoValue}>v1.0.0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>API 상태</Text>
            <View style={styles.statusDot}>
              <View style={styles.dot} />
              <Text style={styles.statusOk}>정상</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DB 리전</Text>
            <Text style={styles.infoValue}>ap-northeast-1</Text>
          </View>
        </View>
      </View>

      {/* 로그아웃 */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color={Colors.error} size={20} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>홈케어커넥트 v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    ...Shadows.float,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  profileRole: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    marginTop: 2,
    fontWeight: '600',
  },
  profilePhone: {
    fontSize: FontSize.label,
    color: Colors.onPrimaryContainer,
    marginTop: 2,
  },
  menuSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  menuSectionTitle: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  menuSublabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  infoSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  statusOk: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  logoutSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg,
  },
  logoutText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.error,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSize.label,
    color: Colors.outlineVariant,
    marginBottom: Spacing.xxl,
  },
});
