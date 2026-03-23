import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  User,
  Briefcase,
} from '@/components/icons/TabIcons';

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  sublabel: string;
  onPress: () => void;
  color?: string;
}

export default function HospitalMore() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuthStore();

  const menuItems: MenuItem[] = [
    {
      icon: Users,
      label: '직원 관리',
      sublabel: '간호사, 의사 인력 관리',
      onPress: () => {},
    },
    {
      icon: FileText,
      label: '서비스 요청',
      sublabel: '서비스 요청 접수 및 관리',
      onPress: () => {},
    },
    {
      icon: Briefcase,
      label: '의사 방문',
      sublabel: '소견 입력 및 AI 변환',
      onPress: () => {},
    },
    {
      icon: DollarSign,
      label: '수납 관리',
      sublabel: '수납 내역 및 정산',
      onPress: () => {},
    },
    {
      icon: Shield,
      label: '건보 청구 자료',
      sublabel: '건강보험 청구 데이터 관리',
      onPress: () => {},
    },
    {
      icon: Settings,
      label: '설정',
      sublabel: '기관 정보, 알림 설정',
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
          <Text style={styles.profileRole}>기관 관리자</Text>
          <Text style={styles.profilePhone}>{profile?.phone ?? ''}</Text>
        </View>
      </View>

      {/* 메뉴 리스트 */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>관리 메뉴</Text>
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
