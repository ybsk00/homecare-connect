import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { TrendingUp, Users, Building2, Activity } from '@/components/icons/TabIcons';

export default function AdminKPI() {
  const insets = useSafeAreaInsets();

  // 전체 플랫폼 통계
  const { data: platformStats } = useQuery({
    queryKey: ['admin-platform-stats'],
    queryFn: async () => {
      // 신규 가입 (최근 30일)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

      const [
        { count: totalProfiles },
        { count: recentProfiles },
        { count: activePatients },
        { count: totalOrgs },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgoStr),
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalUsers: totalProfiles ?? 0,
        newSignups: recentProfiles ?? 0,
        activePatients: activePatients ?? 0,
        totalOrgs: totalOrgs ?? 0,
      };
    },
  });

  // 전환율 계산 (가입 대비 활성 환자)
  const conversionRate = useMemo(() => {
    if (!platformStats || platformStats.totalUsers === 0) return 0;
    return Math.round((platformStats.activePatients / platformStats.totalUsers) * 100);
  }, [platformStats]);

  // 30일 추이 데이터
  const { data: dailyTrend } = useQuery({
    queryKey: ['admin-daily-trend'],
    queryFn: async () => {
      const days: { date: string; count: number }[] = [];
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const { count } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .eq('scheduled_date', dateStr);

        days.push({ date: dateStr, count: count ?? 0 });
      }

      return days;
    },
    staleTime: 1000 * 60 * 10,
  });

  const maxTrend = Math.max(...(dailyTrend ?? []).map(d => d.count), 1);
  const stats = platformStats ?? { totalUsers: 0, newSignups: 0, activePatients: 0, totalOrgs: 0 };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>플랫폼 KPI</Text>
        <Text style={styles.subtitle}>홈케어커넥트 운영 현황</Text>
      </View>

      {/* StatCards 4개 */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: `${Colors.secondary}10` }]}>
          <TrendingUp color={Colors.secondary} size={22} />
          <Text style={[styles.statNumber, { color: Colors.secondary }]}>{conversionRate}%</Text>
          <Text style={styles.statLabel}>전환율</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: `${Colors.primary}08` }]}>
          <Activity color={Colors.primary} size={22} />
          <Text style={[styles.statNumber, { color: Colors.primary }]}>{stats.newSignups}</Text>
          <Text style={styles.statLabel}>신규가입</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.redFlag.yellow.bg }]}>
          <Users color={Colors.redFlag.yellow.accent} size={22} />
          <Text style={[styles.statNumber, { color: Colors.redFlag.yellow.text }]}>{stats.activePatients}</Text>
          <Text style={styles.statLabel}>활성환자</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.surfaceContainerLow }]}>
          <Building2 color={Colors.onSurface} size={22} />
          <Text style={[styles.statNumber, { color: Colors.onSurface }]}>{stats.totalOrgs}</Text>
          <Text style={styles.statLabel}>가입기관</Text>
        </View>
      </View>

      {/* 30일 추이 차트 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>30일 방문 추이</Text>
        <View style={styles.chartContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {(dailyTrend ?? []).map(({ date, count }, idx) => {
                const day = parseInt(date.split('-')[2], 10);
                return (
                  <View key={idx} style={styles.barColumn}>
                    <Text style={styles.barValue}>{count > 0 ? count : ''}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max((count / maxTrend) * 100, count > 0 ? 8 : 0)}%` as any,
                            backgroundColor: count > 0 ? Colors.secondary : 'transparent',
                          },
                        ]}
                      />
                    </View>
                    {(idx % 5 === 0 || idx === (dailyTrend?.length ?? 0) - 1) && (
                      <Text style={styles.barLabel}>{day}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 플랫폼 요약 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>플랫폼 요약</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>전체 회원 수</Text>
            <Text style={styles.summaryValue}>{stats.totalUsers}명</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>30일 신규 가입</Text>
            <Text style={styles.summaryValue}>{stats.newSignups}명</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>활성 환자</Text>
            <Text style={styles.summaryValue}>{stats.activePatients}명</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>가입 기관</Text>
            <Text style={styles.summaryValue}>{stats.totalOrgs}개</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>전환율</Text>
            <Text style={[styles.summaryValue, { color: Colors.secondary }]}>{conversionRate}%</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '47%' as any,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    flexGrow: 1,
  },
  statNumber: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  chartContainer: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 4,
  },
  barColumn: {
    width: 20,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 2,
  },
  barTrack: {
    width: 14,
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 8,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  summaryLabel: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
