import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VisitCard } from '@/components/visit/VisitCard';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePatientStore } from '@/stores/patient-store';
import { useVisitsByPatient } from '@/hooks/useVisits';
import { colors, spacing, radius, typography } from '@/constants/theme';
import {
  getToday,
  addDays,
  toDateString,
  getVisitDayLabel,
  isToday,
} from '@homecare/shared-utils';
import type { Tables } from '@homecare/shared-types';

type Visit = Tables<'visits'> & {
  nurse?: {
    id: string;
    staff_type: string;
    user?: { full_name: string; avatar_url: string | null } | null;
  } | null;
  visit_record?: { id: string }[] | null;
};

export default function ScheduleScreen() {
  const router = useRouter();
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const visitsQuery = useVisitsByPatient(selectedPatientId, 50, 0);

  const today = new Date();
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  const weekDates = useMemo(() => {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = addDays(today, mondayOffset + selectedWeekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedWeekOffset]);

  const [selectedDate, setSelectedDate] = useState(getToday());

  const visitsForDate = useMemo(() => {
    if (!visitsQuery.data?.data) return [];
    return (visitsQuery.data.data as any[]).filter(
      (v: Visit) => v.scheduled_date === selectedDate,
    );
  }, [visitsQuery.data, selectedDate]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Weekly calendar */}
      <View style={styles.calendar}>
        <View style={styles.weekNav}>
          <TouchableOpacity
            onPress={() => setSelectedWeekOffset((p) => p - 1)}
            style={styles.navButton}
          >
            <Text style={styles.navArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>
            {toDateString(weekDates[0]).slice(5)} ~ {toDateString(weekDates[6]).slice(5)}
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedWeekOffset((p) => p + 1)}
            style={styles.navButton}
          >
            <Text style={styles.navArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {weekDates.map((date) => {
            const dateStr = toDateString(date);
            const isSelected = dateStr === selectedDate;
            const isTodayDate = isToday(date);
            const dayIdx = date.getDay();

            const hasVisit = (visitsQuery.data?.data as any[] | undefined)?.some(
              (v: Visit) => v.scheduled_date === dateStr,
            );

            return (
              <TouchableOpacity
                key={dateStr}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isTodayDate && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(dateStr)}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                    dayIdx === 0 && !isSelected && styles.daySunday,
                  ]}
                >
                  {getVisitDayLabel(dayIdx)}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {/* Teal dot for visit days */}
                {hasVisit && (
                  <View
                    style={[
                      styles.dot,
                      isSelected && styles.dotSelected,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Visit list */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={visitsQuery.isRefetching}
            onRefresh={() => visitsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {visitsQuery.isLoading ? (
          <Loading />
        ) : !selectedPatientId ? (
          <EmptyState
            icon="👤"
            title="환자를 먼저 등록해주세요"
            actionLabel="환자 등록"
            onAction={() => router.push('/patient/register')}
          />
        ) : visitsForDate.length === 0 ? (
          <EmptyState
            icon="📅"
            title="해당 날짜에 예정된 방문이 없습니다"
          />
        ) : (
          (visitsForDate as Visit[]).map((visit: Visit) => (
            <VisitCard
              key={visit.id}
              visitId={visit.id}
              scheduledDate={visit.scheduled_date}
              scheduledTime={visit.scheduled_time}
              status={visit.status}
              estimatedDurationMin={visit.estimated_duration_min}
              nurseName={visit.nurse?.user?.full_name}
              nurseType={visit.nurse?.staff_type}
              hasRecord={
                !!(visit.visit_record && visit.visit_record.length > 0)
              }
              onPress={(id) => router.push(`/visit/${id}`)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },

  calendar: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    // NO border - tonal shift from surface provides definition
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  navButton: {
    padding: spacing.sm,
  },
  navArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
  weekLabel: {
    ...typography.label,
    fontSize: 15,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 44,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    backgroundColor: colors.surfaceContainerLow,
  },
  dayLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  dayLabelSelected: { color: colors.onPrimary },
  daySunday: { color: colors.error },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  dayNumberSelected: { color: colors.onPrimary },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.secondary,
    marginTop: 3,
  },
  dotSelected: { backgroundColor: colors.onPrimary },

  scroll: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl + 40,
  },
});
