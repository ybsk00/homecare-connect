import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { User, Activity, Calendar, Users } from '@/components/icons/TabIcons';

export default function HospitalPatientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);

  const { data: patient, refetch } = useQuery({
    queryKey: ['hospital-patient-detail', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('patients')
        .select(`
          id, care_level, status, diagnosis, service_type, notes, created_at,
          user:profiles!inner(full_name, phone, avatar_url, email),
          organization:organizations(name)
        `)
        .eq('id', id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: vitals } = useQuery({
    queryKey: ['patient-vitals', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('vital_signs')
        .select('id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, spo2, measured_at')
        .eq('patient_id', id)
        .order('measured_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: visits } = useQuery({
    queryKey: ['patient-visits', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('visits')
        .select(`
          id, visit_date, status, visit_type, notes,
          nurse:staff(user:profiles!inner(full_name))
        `)
        .eq('patient_id', id)
        .order('visit_date', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!id,
  });

  const { data: assignedNurse } = useQuery({
    queryKey: ['patient-nurse', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select(`
          id, staff_type, specialties,
          user:profiles!inner(full_name, phone)
        `)
        .eq('id', (patient as any)?.assigned_nurse_id)
        .single();
      return data;
    },
    enabled: !!(patient as any)?.assigned_nurse_id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'paused': return '일시중지';
      case 'discharged': return '퇴원';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.secondary;
      case 'paused': return Colors.redFlag.yellow.accent;
      case 'discharged': return Colors.onSurfaceVariant;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getVisitStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'scheduled': return '예정';
      case 'cancelled': return '취소';
      case 'in_progress': return '진행중';
      default: return status;
    }
  };

  const p = patient as any;

  return (
    <>
      <Stack.Screen options={{ title: '환자 상세' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* 환자 정보 카드 */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <User color={Colors.onPrimary} size={32} />
          </View>
          <Text style={styles.heroName}>{p?.user?.full_name ?? '환자'}</Text>
          {p?.status && (
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(p.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(p.status) }]}>
                {getStatusLabel(p.status)}
              </Text>
            </View>
          )}
          <View style={styles.heroDetails}>
            {p?.care_level && (
              <View style={styles.detailChip}>
                <Text style={styles.detailChipText}>요양 {p.care_level}등급</Text>
              </View>
            )}
            {p?.diagnosis && (
              <View style={styles.detailChip}>
                <Text style={styles.detailChipText}>{p.diagnosis}</Text>
              </View>
            )}
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.contactLabel}>연락처</Text>
            <Text style={styles.contactValue}>{p?.user?.phone ?? '-'}</Text>
          </View>
          {p?.user?.email && (
            <View style={styles.contactRow}>
              <Text style={styles.contactLabel}>이메일</Text>
              <Text style={styles.contactValue}>{p.user.email}</Text>
            </View>
          )}
        </View>

        {/* 서비스 플랜 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서비스 플랜</Text>
          <View style={styles.card}>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>서비스 유형</Text>
              <Text style={styles.planValue}>{p?.service_type ?? '일반 방문간호'}</Text>
            </View>
            {p?.notes && (
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>비고</Text>
                <Text style={styles.planValue}>{p.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 바이탈 이력 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Activity color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>바이탈 이력</Text>
          </View>
          {(vitals ?? []).length > 0 ? (
            (vitals ?? []).map((v: any) => (
              <View key={v.id} style={styles.vitalCard}>
                <Text style={styles.vitalDate}>
                  {new Date(v.measured_at).toLocaleDateString('ko-KR')}
                </Text>
                <View style={styles.vitalGrid}>
                  {v.blood_pressure_systolic && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>혈압</Text>
                      <Text style={styles.vitalValue}>
                        {v.blood_pressure_systolic}/{v.blood_pressure_diastolic}
                      </Text>
                    </View>
                  )}
                  {v.heart_rate && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>심박수</Text>
                      <Text style={styles.vitalValue}>{v.heart_rate}</Text>
                    </View>
                  )}
                  {v.temperature && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>체온</Text>
                      <Text style={styles.vitalValue}>{v.temperature}°C</Text>
                    </View>
                  )}
                  {v.spo2 && (
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>SpO2</Text>
                      <Text style={styles.vitalValue}>{v.spo2}%</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>바이탈 기록이 없습니다</Text>
            </View>
          )}
        </View>

        {/* 방문 기록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>방문 기록</Text>
          </View>
          {(visits ?? []).length > 0 ? (
            (visits ?? []).map((v: any) => (
              <View key={v.id} style={styles.visitCard}>
                <View style={styles.visitHeader}>
                  <Text style={styles.visitDate}>
                    {new Date(v.visit_date).toLocaleDateString('ko-KR')}
                  </Text>
                  <View style={[
                    styles.visitStatusBadge,
                    { backgroundColor: v.status === 'completed' ? `${Colors.secondary}15` : `${Colors.redFlag.yellow.accent}15` },
                  ]}>
                    <Text style={[
                      styles.visitStatusText,
                      { color: v.status === 'completed' ? Colors.secondary : Colors.redFlag.yellow.accent },
                    ]}>
                      {getVisitStatusLabel(v.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.visitType}>{v.visit_type ?? '정기방문'}</Text>
                {(v as any).nurse?.user?.full_name && (
                  <Text style={styles.visitNurse}>담당: {(v as any).nurse.user.full_name}</Text>
                )}
                {v.notes && <Text style={styles.visitNotes}>{v.notes}</Text>}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>방문 기록이 없습니다</Text>
            </View>
          )}
        </View>

        {/* 담당 간호사 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>담당 간호사</Text>
          </View>
          {assignedNurse ? (
            <View style={styles.nurseCard}>
              <View style={styles.nurseAvatar}>
                <User color={Colors.onPrimary} size={22} />
              </View>
              <View style={styles.nurseInfo}>
                <Text style={styles.nurseName}>{(assignedNurse as any).user?.full_name}</Text>
                <Text style={styles.nurseType}>{(assignedNurse as any).staff_type ?? '간호사'}</Text>
                <Text style={styles.nursePhone}>{(assignedNurse as any).user?.phone ?? ''}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>배정된 간호사가 없습니다</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  heroCard: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    alignItems: 'center',
    ...Shadows.float,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroName: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  heroDetails: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  detailChip: {
    backgroundColor: `${Colors.onPrimary}20`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  detailChipText: {
    fontSize: FontSize.label,
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: Spacing.xs,
  },
  contactLabel: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
  },
  contactValue: {
    fontSize: FontSize.caption,
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  planLabel: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  planValue: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
    flex: 1,
    textAlign: 'right',
  },
  vitalCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  vitalDate: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  vitalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  vitalItem: {
    backgroundColor: Colors.vital.normal.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    minWidth: '45%',
  },
  vitalLabel: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  vitalValue: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.vital.normal.text,
    marginTop: 2,
  },
  visitCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  visitDate: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  visitStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  visitStatusText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  visitType: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  visitNurse: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '500',
  },
  visitNotes: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  nurseCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  nurseAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  nurseInfo: {
    flex: 1,
  },
  nurseName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  nurseType: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  nursePhone: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.ambient,
  },
  emptyText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
});
