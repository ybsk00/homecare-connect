import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

// ── 직종 한글 ──
const staffTypeLabel: Record<string, string> = {
  nurse: '간호사',
  doctor: '의사',
  physio: '물리치료사',
  caregiver: '요양보호사',
};

// ── 메뉴 아이템 ──
const menuItems = [
  { key: 'stats', icon: '📊', label: '월간 통계', desc: '방문 실적 및 활동 현황' },
  { key: 'ai', icon: '🤖', label: 'AI 어시스턴트', desc: '케어 플래닝 지원' },
  { key: 'notifications', icon: '🔔', label: '알림 설정', desc: '푸시 알림 및 수신 설정' },
  { key: 'license', icon: '📄', label: '자격증 관리', desc: '면허 및 자격 정보' },
];

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const { profile, staffInfo, signOut } = useAuthStore();

  // ── 소속 기관 정보 ──
  const { data: org } = useQuery({
    queryKey: ['nurse-org', staffInfo?.organization_id],
    queryFn: async () => {
      if (!staffInfo?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, org_type, address, phone, logo_url')
        .eq('id', staffInfo.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!staffInfo?.organization_id,
  });

  // ── 방문 통계 ──
  const { data: visitStats } = useQuery({
    queryKey: ['nurse-visit-stats', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return { total: 0, thisMonth: 0 };
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const { count: total } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('nurse_id', staffInfo.id)
        .eq('status', 'completed');
      const { count: thisMonth } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('nurse_id', staffInfo.id)
        .eq('status', 'completed')
        .gte('scheduled_date', monthStart);
      return { total: total ?? 0, thisMonth: thisMonth ?? 0 };
    },
    enabled: !!staffInfo?.id,
  });

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const handleMenuPress = (key: string) => {
    const routes: Record<string, string> = {
      stats: '/nurse/stats',
      ai: '/nurse/agent',
      notifications: '/nurse/settings',
      license: '/nurse/settings',
    };
    const route = routes[key];
    if (route) {
      router.push(route as any);
    }
  };

  // ── 기관 유형 한글 ──
  const orgTypeLabel: Record<string, string> = {
    home_nursing: '방문간호센터',
    home_care: '방문요양센터',
    rehab_center: '재활센터',
    clinic: '의원',
    hospital: '병원',
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 헤더 ── */}
      <Text style={styles.headerTitle}>마이페이지</Text>

      {/* ── 프로필 카드 ── */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {profile?.full_name?.charAt(0) ?? '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name ?? '간호사'}</Text>
          <Text style={styles.profileType}>
            {staffTypeLabel[staffInfo?.staff_type ?? ''] ?? '의료진'}
          </Text>
          {staffInfo?.license_number && (
            <Text style={styles.profileLicense}>면허번호: {staffInfo.license_number}</Text>
          )}
          {staffInfo?.specialties && staffInfo.specialties.length > 0 && (
            <View style={styles.specialtyRow}>
              {staffInfo.specialties.map((s: string, i: number) => (
                <View key={i} style={styles.specialtyChip}>
                  <Text style={styles.specialtyText}>{s}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── 간단 통계 ── */}
      <View style={styles.miniStatsRow}>
        <View style={styles.miniStat}>
          <Text style={styles.miniStatNumber}>{visitStats?.thisMonth ?? 0}</Text>
          <Text style={styles.miniStatLabel}>이번 달 방문</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatNumber}>{visitStats?.total ?? 0}</Text>
          <Text style={styles.miniStatLabel}>총 방문</Text>
        </View>
        <View style={styles.miniStatDivider} />
        <View style={styles.miniStat}>
          <Text style={styles.miniStatNumber}>{staffInfo?.max_patients ?? '-'}</Text>
          <Text style={styles.miniStatLabel}>최대 환자</Text>
        </View>
      </View>

      {/* ── 소속 기관 ── */}
      {org && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>소속 기관</Text>
          <View style={styles.orgCard}>
            <View style={styles.orgIconContainer}>
              <Text style={styles.orgIcon}>🏥</Text>
            </View>
            <View style={styles.orgInfo}>
              <Text style={styles.orgName}>{org.name}</Text>
              <Text style={styles.orgType}>
                {orgTypeLabel[org.org_type] ?? org.org_type}
              </Text>
              <Text style={styles.orgAddress} numberOfLines={1}>{org.address}</Text>
              {org.phone && <Text style={styles.orgPhone}>{org.phone}</Text>}
            </View>
          </View>
        </View>
      )}

      {/* ── 메뉴 ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>메뉴</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.menuItem}
            onPress={() => handleMenuPress(item.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 로그아웃 ── */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      {/* ── 앱 버전 ── */}
      <Text style={styles.version}>홈케어커넥트 v1.0.0</Text>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },

  // ── 헤더 ──
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },

  // ── 프로필 카드 ──
  profileCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.float,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  profileAvatarText: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.onPrimaryContainer,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  profileType: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 2,
  },
  profileLicense: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  specialtyChip: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  specialtyText: {
    fontSize: FontSize.overline,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  // ── 미니 통계 ──
  miniStatsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.ambient,
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.primary,
  },
  miniStatLabel: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  miniStatDivider: {
    width: 1,
    backgroundColor: Colors.outlineVariant,
    marginVertical: Spacing.xs,
  },

  // ── 섹션 ──
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },

  // ── 소속 기관 ──
  orgCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  orgIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  orgIcon: {
    fontSize: 24,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  orgType: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    marginTop: 2,
  },
  orgAddress: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  orgPhone: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // ── 메뉴 ──
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    minHeight: TouchTarget.comfortable,
    ...Shadows.ambient,
  },
  menuIcon: {
    fontSize: 24,
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
  menuDesc: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  menuChevron: {
    fontSize: FontSize.title,
    color: Colors.outlineVariant,
    fontWeight: '300',
    marginLeft: Spacing.sm,
  },

  // ── 로그아웃 ──
  logoutButton: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: TouchTarget.comfortable,
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoutText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.error,
  },

  // ── 버전 ──
  version: {
    fontSize: FontSize.label,
    color: Colors.outlineVariant,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
