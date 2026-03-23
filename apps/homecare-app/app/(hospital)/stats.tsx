import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { TrendingUp, CheckCircle, Clock, DollarSign } from '@/components/icons/TabIcons';

export default function HospitalStats() {
  const insets = useSafeAreaInsets();
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
  const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const { data: monthVisits } = useQuery({
    queryKey: ['hospital-stats-visits', orgId, monthStart],
    queryFn: async () => {
      if (!orgId) return [];

      const { data } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, status, duration_minutes,
          patient:patients!inner(id, organization_id)
        `)
        .eq('patient.organization_id', orgId)
        .gte('scheduled_date', monthStart)
        .lt('scheduled_date', monthEnd);

      return data ?? [];
    },
    enabled: !!orgId,
  });

  const stats = useMemo(() => {
    const visits = monthVisits ?? [];
    const totalVisits = visits.length;
    const completedVisits = visits.filter((v: any) => v.status === 'completed').length;
    const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;
    const totalMinutes = visits
      .filter((v: any) => v.status === 'completed')
      .reduce((sum: number, v: any) => sum + (v.duration_minutes ?? 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    return { totalVisits, completedVisits, completionRate, totalHours };
  }, [monthVisits]);

  // 일별 방문 현황
  const dailyData = useMemo(() => {
    const visits = monthVisits ?? [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daily: { day: number; count: number }[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const count = visits.filter((v: any) => v.scheduled_date === dateStr).length;
      daily.push({ day: i, count });
    }

    return daily;
  }, [monthVisits, selectedYear, selectedMonth]);

  const maxDailyCount = Math.max(...dailyData.map(d => d.count), 1);

  const prevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const nextMonthNav = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>통계</Text>
      </View>

      {/* 월 선택 */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
          <Text style={styles.monthNavBtnText}>이전</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{selectedYear}년 {selectedMonth}월</Text>
        <TouchableOpacity onPress={nextMonthNav} style={styles.monthNavBtn}>
          <Text style={styles.monthNavBtnText}>다음</Text>
        </TouchableOpacity>
      </View>

      {/* StatCards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: `${Colors.secondary}10` }]}>
          <TrendingUp color={Colors.secondary} size={20} />
          <Text style={[styles.statNumber, { color: Colors.secondary }]}>{stats.totalVisits}</Text>
          <Text style={styles.statLabel}>총 방문수</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: `${Colors.primary}08` }]}>
          <CheckCircle color={Colors.primary} size={20} />
          <Text style={[styles.statNumber, { color: Colors.primary }]}>{stats.completionRate}%</Text>
          <Text style={styles.statLabel}>완료율</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.redFlag.yellow.bg }]}>
          <Clock color={Colors.redFlag.yellow.accent} size={20} />
          <Text style={[styles.statNumber, { color: Colors.redFlag.yellow.text }]}>{stats.totalHours}h</Text>
          <Text style={styles.statLabel}>총 시간</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.surfaceContainerLow }]}>
          <DollarSign color={Colors.onSurface} size={20} />
          <Text style={[styles.statNumber, { color: Colors.onSurface }]}>-</Text>
          <Text style={styles.statLabel}>매출</Text>
        </View>
      </View>

      {/* 일별 방문 현황 바 차트 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>일별 방문 현황</Text>
        <View style={styles.chartContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.barChart}>
              {dailyData.map(({ day, count }) => (
                <View key={day} style={styles.barColumn}>
                  <Text style={styles.barValue}>{count > 0 ? count : ''}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max((count / maxDailyCount) * 100, count > 0 ? 8 : 0)}%` as any,
                          backgroundColor: count > 0 ? Colors.secondary : 'transparent',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{day}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 요약 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>월간 요약</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>전체 방문</Text>
            <Text style={styles.summaryValue}>{stats.totalVisits}건</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>완료 방문</Text>
            <Text style={styles.summaryValue}>{stats.completedVisits}건</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>총 서비스 시간</Text>
            <Text style={styles.summaryValue}>{stats.totalHours}시간</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>완료율</Text>
            <Text style={[styles.summaryValue, { color: Colors.secondary }]}>{stats.completionRate}%</Text>
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
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  monthNavBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  monthNavBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.secondary,
  },
  monthLabel: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
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
    width: 24,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 2,
  },
  barTrack: {
    width: 16,
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
    fontSize: 9,
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
