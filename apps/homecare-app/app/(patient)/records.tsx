import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Activity, ClipboardList, Filter } from '@/components/icons/TabIcons';

const VITAL_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'blood_pressure', label: '혈압' },
  { key: 'heart_rate', label: '심박' },
  { key: 'temperature', label: '체온' },
  { key: 'spo2', label: '산소포화도' },
];

export default function RecordsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [activeFilter, setActiveFilter] = useState('all');

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

  // 완료된 방문 + 바이탈 기록
  const {
    data: records,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['visit-records', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('visit_records')
        .select('id, vitals, nursing_notes, created_at, visit:visits(scheduled_date, scheduled_time, nurse:staff(user:profiles(full_name)))')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

  const hasVitalType = (vitals: any, type: string) => {
    if (!vitals) return false;
    if (type === 'blood_pressure') return vitals.systolic != null || vitals.diastolic != null;
    if (type === 'heart_rate') return vitals.heart_rate != null;
    if (type === 'temperature') return vitals.temperature != null;
    if (type === 'spo2') return vitals.spo2 != null;
    return true;
  };

  const filteredRecords = records?.filter((r: any) =>
    activeFilter === 'all' ? true : hasVitalType(r.vitals, activeFilter)
  );

  const formatVitalValue = (vitals: any) => {
    if (!vitals) return '기록 없음';
    const parts: string[] = [];
    if (vitals.systolic != null) parts.push(`혈압 ${vitals.systolic}/${vitals.diastolic ?? '-'}`);
    if (vitals.heart_rate != null) parts.push(`심박 ${vitals.heart_rate}bpm`);
    if (vitals.temperature != null) parts.push(`체온 ${vitals.temperature}°C`);
    if (vitals.spo2 != null) parts.push(`SpO2 ${vitals.spo2}%`);
    return parts.length > 0 ? parts.join(' · ') : '기록 없음';
  };

  const getVitalStatus = (vitals: any) => {
    if (!vitals) return { label: '미측정', color: Colors.onSurfaceVariant };
    let isWarning = false;
    let isCritical = false;
    if (vitals.systolic > 140 || vitals.systolic < 90) isWarning = true;
    if (vitals.systolic > 180 || vitals.systolic < 70) isCritical = true;
    if (vitals.heart_rate > 100 || vitals.heart_rate < 50) isWarning = true;
    if (vitals.temperature > 37.5) isWarning = true;
    if (vitals.temperature > 38.5) isCritical = true;
    if (vitals.spo2 != null && vitals.spo2 < 95) isWarning = true;
    if (vitals.spo2 != null && vitals.spo2 < 90) isCritical = true;

    if (isCritical) return { label: '위험', color: Colors.error };
    if (isWarning) return { label: '주의', color: '#F59E0B' };
    return { label: '정상', color: Colors.secondary };
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>기록</Text>
        <Text style={styles.subtitle}>방문 및 바이탈 기록을 확인하세요</Text>
      </View>

      {/* 바이탈 필터 칩 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {VITAL_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              activeFilter === f.key && styles.filterChipActive,
            ]}
            activeOpacity={0.7}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 기록 리스트 */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.secondary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.secondary} style={{ paddingVertical: Spacing.xxxl }} />
        ) : filteredRecords && filteredRecords.length > 0 ? (
          filteredRecords.map((record: any) => {
            const vitalStatus = getVitalStatus(record.vitals);
            const visit = record.visit;
            return (
              <TouchableOpacity key={record.id} style={styles.recordCard} activeOpacity={0.7}>
                <View style={styles.recordHeader}>
                  <View>
                    <Text style={styles.recordDate}>
                      {visit?.scheduled_date
                        ? new Date(visit.scheduled_date).toLocaleDateString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })
                        : new Date(record.created_at).toLocaleDateString('ko-KR')}
                    </Text>
                    <Text style={styles.recordNurse}>
                      {visit?.nurse?.user?.full_name ?? '간호사 정보 없음'}
                    </Text>
                  </View>
                  <View style={[styles.vitalChip, { backgroundColor: `${vitalStatus.color}15` }]}>
                    <Text style={[styles.vitalChipText, { color: vitalStatus.color }]}>
                      {vitalStatus.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.vitalSummary}>
                  <Activity color={Colors.onSurfaceVariant} size={14} />
                  <Text style={styles.vitalSummaryText} numberOfLines={1}>
                    {formatVitalValue(record.vitals)}
                  </Text>
                </View>
                {record.nursing_notes && (
                  <Text style={styles.nursingNotes} numberOfLines={2}>
                    {record.nursing_notes}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <ClipboardList color={Colors.onSurfaceVariant} size={40} />
            <Text style={styles.emptyTitle}>기록이 없습니다</Text>
            <Text style={styles.emptyDesc}>
              {activeFilter !== 'all'
                ? '해당 바이탈 유형의 기록이 없습니다'
                : '아직 방문 기록이 없습니다'}
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
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },

  // Filter
  filterRow: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: Colors.onPrimary,
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  recordCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.ambient,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  recordDate: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  recordNurse: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  vitalChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  vitalChipText: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  vitalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  vitalSummaryText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  nursingNotes: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
    lineHeight: 20,
    fontStyle: 'italic',
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
