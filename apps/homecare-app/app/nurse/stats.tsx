import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';

function getMonthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { start, end };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { staffInfo } = useAuthStore();
  const nurseId = staffInfo?.id;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { start, end } = getMonthRange(year, month);
  const daysInMonth = getDaysInMonth(year, month);

  // -- Monthly visits --
  const { data: visits, isLoading } = useQuery({
    queryKey: ['nurse-monthly-stats', nurseId, year, month],
    queryFn: async () => {
      if (!nurseId) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, scheduled_date, status, estimated_duration_min, checkin_at, checkout_at')
        .eq('nurse_id', nurseId)
        .gte('scheduled_date', start)
        .lt('scheduled_date', end)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!nurseId,
  });

  // -- Computed stats --
  const stats = useMemo(() => {
    if (!visits) return { total: 0, completed: 0, totalMinutes: 0, avgMinutes: 0 };
    const total = visits.length;
    const completed = visits.filter((v: any) => v.status === 'completed').length;
    const totalMinutes = visits
      .filter((v: any) => v.status === 'completed')
      .reduce((sum: number, v: any) => {
        if (v.checkin_at && v.checkout_at) {
          const diff = (new Date(v.checkout_at).getTime() - new Date(v.checkin_at).getTime()) / 60000;
          return sum + Math.round(diff);
        }
        return sum + (v.estimated_duration_min ?? 30);
      }, 0);
    const avgMinutes = completed > 0 ? Math.round(totalMinutes / completed) : 0;
    return { total, completed, totalMinutes, avgMinutes };
  }, [visits]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // -- Daily chart data --
  const dailyData = useMemo(() => {
    const days: number[] = Array(daysInMonth).fill(0);
    if (visits) {
      visits.forEach((v: any) => {
        const day = parseInt(v.scheduled_date.split('-')[2]);
        if (day >= 1 && day <= daysInMonth) {
          days[day - 1]++;
        }
      });
    }
    return days;
  }, [visits, daysInMonth]);

  const maxDaily = Math.max(...dailyData, 1);

  const goPrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* -- Header -- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>월간 통계</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* -- Month Selector -- */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goPrev} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{year}년 {month}월</Text>
        <TouchableOpacity onPress={goNext} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: Spacing.xxxl }} />
      ) : (
        <>
          {/* -- StatCards -- */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>총 방문</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{completionRate}%</Text>
              <Text style={styles.statLabel}>완료율</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
              </Text>
              <Text style={styles.statLabel}>총 시간</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.avgMinutes}분</Text>
              <Text style={styles.statLabel}>평균 시간</Text>
            </View>
          </View>

          {/* -- Bar Chart -- */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>일별 방문 현황</Text>
            <View style={styles.chartContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.barsRow}>
                  {dailyData.map((count, i) => (
                    <View key={i} style={styles.barColumn}>
                      <View style={styles.barWrapper}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: count > 0 ? Math.max((count / maxDaily) * 120, 4) : 0,
                              backgroundColor: count > 0 ? Colors.secondary : 'transparent',
                            },
                          ]}
                        />
                      </View>
                      {count > 0 && (
                        <Text style={styles.barCount}>{count}</Text>
                      )}
                      <Text style={styles.barDay}>{i + 1}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* -- Summary -- */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>요약</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>완료 방문</Text>
              <Text style={styles.summaryValue}>{stats.completed}건</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>미완료/취소</Text>
              <Text style={styles.summaryValue}>{stats.total - stats.completed}건</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>일 평균 방문</Text>
              <Text style={styles.summaryValue}>
                {(stats.total / daysInMonth).toFixed(1)}건
              </Text>
            </View>
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.xl },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },

  // Month Selector
  monthSelector: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: Spacing.xl, marginBottom: Spacing.xl,
  },
  monthArrow: { padding: Spacing.sm },
  monthArrowText: { fontSize: FontSize.subtitle, fontWeight: '700', color: Colors.primary },
  monthText: { fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.onSurface },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadows.ambient,
  },
  statNumber: { fontSize: FontSize.title, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: Spacing.xs },

  // Chart
  chartSection: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },
  chartContainer: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, ...Shadows.ambient,
  },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, minHeight: 160 },
  barColumn: { alignItems: 'center', width: 20 },
  barWrapper: { height: 120, justifyContent: 'flex-end' },
  bar: { width: 12, borderRadius: 3 },
  barCount: { fontSize: 8, fontWeight: '700', color: Colors.secondary, marginTop: 2 },
  barDay: { fontSize: 8, color: Colors.onSurfaceVariant, marginTop: 2 },

  // Summary
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.xl, ...Shadows.ambient,
  },
  summaryTitle: {
    fontSize: FontSize.body, fontWeight: '700', color: Colors.secondary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  summaryLabel: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant },
  summaryValue: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.onSurface },
});
