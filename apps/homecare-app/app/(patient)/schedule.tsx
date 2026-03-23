import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Clock, Calendar as CalendarIcon } from '@/components/icons/TabIcons';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  // 환자 조회
  const { data: patients } = useQuery({
    queryKey: ['guardian-patients', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('guardian_patient_links')
        .select('patient:patients(*)')
        .eq('guardian_id', userId);
      if (error) throw error;
      return data?.map((d: any) => d.patient) ?? [];
    },
    enabled: !!userId,
  });

  const patientId = patients?.[0]?.id;
  const selectedDateStr = formatDate(selectedDate);

  // 선택 날짜 방문 일정
  const {
    data: visits,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['schedule-visits', patientId, selectedDateStr],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('*, nurse:staff(user:profiles(full_name))')
        .eq('patient_id', patientId)
        .eq('scheduled_date', selectedDateStr)
        .order('scheduled_time', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

  const todayStr = formatDate(new Date());

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      scheduled: '예정',
      confirmed: '확정',
      completed: '완료',
      in_progress: '진행중',
      cancelled: '취소',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'completed') return Colors.secondary;
    if (status === 'cancelled') return Colors.error;
    if (status === 'in_progress') return '#F59E0B';
    if (status === 'confirmed') return Colors.primary;
    return Colors.onSurfaceVariant;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>일정</Text>
        <Text style={styles.subtitle}>
          {selectedDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* 주간 캘린더 (가로 스크롤) */}
      <FlatList
        data={weekDates}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekCalendar}
        keyExtractor={(item) => formatDate(item)}
        renderItem={({ item }) => {
          const dateStr = formatDate(item);
          const isSelected = dateStr === selectedDateStr;
          const isToday = dateStr === todayStr;
          return (
            <TouchableOpacity
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              activeOpacity={0.7}
              onPress={() => setSelectedDate(item)}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSelected && styles.dayLabelSelected,
                  item.getDay() === 0 && styles.daySunday,
                  item.getDay() === 6 && styles.daySaturday,
                ]}
              >
                {WEEKDAYS[item.getDay()]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
                {item.getDate()}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* 방문 리스트 */}
      <ScrollView
        style={styles.visitList}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.secondary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.secondary} style={{ paddingVertical: Spacing.xxxl }} />
        ) : visits && visits.length > 0 ? (
          visits.map((visit: any) => {
            const statusColor = getStatusColor(visit.status);
            return (
              <View key={visit.id} style={styles.visitCard}>
                <View style={[styles.visitTimeBar, { backgroundColor: statusColor }]} />
                <View style={styles.visitContent}>
                  <View style={styles.visitRow}>
                    <Text style={styles.visitTime}>
                      {visit.scheduled_time?.slice(0, 5) ?? '시간 미정'}
                    </Text>
                    <View style={[styles.visitStatus, { backgroundColor: `${statusColor}15` }]}>
                      <Text style={[styles.visitStatusText, { color: statusColor }]}>
                        {getStatusLabel(visit.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.visitNurse}>
                    {visit.nurse?.user?.full_name ?? '간호사 배정중'}
                  </Text>
                  <Text style={styles.visitType}>
                    {visit.visit_type === 'regular' ? '정기 방문' : '특별 방문'}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <CalendarIcon color={Colors.onSurfaceVariant} size={40} />
            <Text style={styles.emptyTitle}>일정이 없습니다</Text>
            <Text style={styles.emptyDesc}>
              {selectedDateStr === todayStr
                ? '오늘은 예정된 방문이 없습니다'
                : '선택한 날짜에 예정된 방문이 없습니다'}
            </Text>
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

  // Week Calendar
  weekCalendar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dayCell: {
    width: 48,
    height: 68,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  dayCellSelected: {
    backgroundColor: Colors.primary,
  },
  dayCellToday: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  dayLabel: {
    fontSize: FontSize.overline,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  dayLabelSelected: {
    color: Colors.onPrimary,
  },
  daySunday: {
    color: Colors.error,
  },
  daySaturday: {
    color: Colors.primary,
  },
  dayNumber: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  dayNumberSelected: {
    color: Colors.onPrimary,
  },

  // Visit List
  visitList: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  visitCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.ambient,
  },
  visitTimeBar: {
    width: 4,
  },
  visitContent: {
    flex: 1,
    padding: Spacing.xl,
  },
  visitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visitTime: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.primary,
  },
  visitStatus: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  visitStatusText: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  visitNurse: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
    marginTop: Spacing.sm,
  },
  visitType: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 1.5,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  emptyDesc: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
});
