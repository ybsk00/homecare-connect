import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Clock, User } from '@/components/icons/TabIcons';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function HospitalSchedule() {
  const insets = useSafeAreaInsets();
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);

  const weekStart = formatDate(weekDates[0]);
  const weekEnd = formatDate(weekDates[6]);

  const { data: visits } = useQuery({
    queryKey: ['hospital-schedule', orgId, weekStart, weekEnd],
    queryFn: async () => {
      if (!orgId) return [];

      const { data } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_time, status, visit_type,
          patient:patients!inner(id, organization_id, user:profiles!inner(full_name)),
          nurse:staff!inner(id, user:profiles!inner(full_name))
        `)
        .eq('patient.organization_id', orgId)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .order('scheduled_time', { ascending: true });

      return data ?? [];
    },
    enabled: !!orgId,
  });

  const selectedDateStr = formatDate(selectedDate);
  const dayVisits = (visits ?? []).filter((v: any) => v.scheduled_date === selectedDateStr);

  const today = formatDate(new Date());

  const getVisitStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return '예정';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소';
      default: return status;
    }
  };

  const getVisitStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return Colors.secondary;
      case 'in_progress': return Colors.primary;
      case 'completed': return Colors.onSurfaceVariant;
      case 'cancelled': return Colors.error;
      default: return Colors.onSurfaceVariant;
    }
  };

  // 각 날짜별 방문 수
  const visitCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    (visits ?? []).forEach((v: any) => {
      counts[v.scheduled_date] = (counts[v.scheduled_date] || 0) + 1;
    });
    return counts;
  }, [visits]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>일정 관리</Text>
        <Text style={styles.subtitle}>전체 직원 방문 일정</Text>
      </View>

      {/* 주간 네비게이션 */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => setWeekOffset(w => w - 1)} style={styles.weekNavBtn}>
          <Text style={styles.weekNavBtnText}>이전</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {weekDates[0].getMonth() + 1}월 {weekDates[0].getDate()}일 ~ {weekDates[6].getMonth() + 1}월 {weekDates[6].getDate()}일
        </Text>
        <TouchableOpacity onPress={() => setWeekOffset(w => w + 1)} style={styles.weekNavBtn}>
          <Text style={styles.weekNavBtnText}>다음</Text>
        </TouchableOpacity>
      </View>

      {/* 주간 캘린더 */}
      <View style={styles.weekRow}>
        {weekDates.map((date, idx) => {
          const dateStr = formatDate(date);
          const isSelected = dateStr === selectedDateStr;
          const isToday = dateStr === today;
          const count = visitCountByDate[dateStr] || 0;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[
                styles.dayName,
                isSelected && styles.dayNameSelected,
                idx === 0 && styles.daySunday,
              ]}>
                {DAY_NAMES[idx]}
              </Text>
              <Text style={[
                styles.dayNumber,
                isSelected && styles.dayNumberSelected,
              ]}>
                {date.getDate()}
              </Text>
              {count > 0 && (
                <View style={[styles.dotIndicator, isSelected && styles.dotIndicatorSelected]}>
                  <Text style={[styles.dotText, isSelected && styles.dotTextSelected]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 선택 날짜 방문 리스트 */}
      <ScrollView contentContainerStyle={styles.listContent}>
        <Text style={styles.dateLabel}>
          {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 ({DAY_NAMES[selectedDate.getDay()]})
          <Text style={styles.dateCount}> {dayVisits.length}건</Text>
        </Text>

        {dayVisits.length > 0 ? (
          dayVisits.map((visit: any) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.timeBlock}>
                <Clock color={Colors.secondary} size={14} />
                <Text style={styles.timeText}>{visit.scheduled_time?.slice(0, 5) ?? '--:--'}</Text>
              </View>
              <View style={styles.visitContent}>
                <Text style={styles.visitPatient}>{visit.patient?.user?.full_name ?? '환자'}</Text>
                <View style={styles.nurseRow}>
                  <User color={Colors.onSurfaceVariant} size={12} />
                  <Text style={styles.nurseName}>{visit.nurse?.user?.full_name ?? '미배정'}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getVisitStatusColor(visit.status)}15` }]}>
                <Text style={[styles.statusText, { color: getVisitStatusColor(visit.status) }]}>
                  {getVisitStatusLabel(visit.status)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>이 날짜에 예정된 방문이 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  weekNavBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  weekNavBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.secondary,
  },
  weekLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.xs,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  dayName: {
    fontSize: FontSize.overline,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  dayNameSelected: {
    color: Colors.onPrimaryContainer,
  },
  daySunday: {
    color: Colors.error,
  },
  dayNumber: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  dayNumberSelected: {
    color: Colors.onPrimary,
  },
  dotIndicator: {
    backgroundColor: `${Colors.secondary}20`,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  dotIndicatorSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.secondary,
  },
  dotTextSelected: {
    color: Colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  dateLabel: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  dateCount: {
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.caption,
  },
  visitCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginRight: Spacing.md,
  },
  timeText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.primary,
  },
  visitContent: {
    flex: 1,
  },
  visitPatient: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  nurseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  nurseName: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
});
