import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Users, BarChart3 } from '@/components/icons/TabIcons';
import { Avatars, getPatientAvatar } from '@/constants/avatars';

export default function HospitalStaffDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const [refreshing, setRefreshing] = useState(false);

  const { data: staff, refetch } = useQuery({
    queryKey: ['staff-detail', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff')
        .select(`
          id, staff_type, license_number, specialties, is_active, max_patients, created_at,
          user:profiles!inner(full_name, phone, avatar_url, email)
        `)
        .eq('id', id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: assignedPatients } = useQuery({
    queryKey: ['staff-patients', id, orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('patients')
        .select(`
          id, care_level, status, gender,
          user:profiles!inner(full_name, phone)
        `)
        .eq('assigned_nurse_id', id)
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!id && !!orgId,
  });

  const { data: monthlyStats } = useQuery({
    queryKey: ['staff-monthly-stats', id],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data: visits } = await supabase
        .from('visits')
        .select('id, status')
        .eq('nurse_id', id)
        .gte('visit_date', firstDay)
        .lte('visit_date', lastDay);

      const total = (visits ?? []).length;
      const completed = (visits ?? []).filter((v: any) => v.status === 'completed').length;

      return { total, completed, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    },
    enabled: !!id,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStaffTypeLabel = (type: string) => {
    switch (type) {
      case 'nurse': return '간호사';
      case 'doctor': return '의사';
      case 'therapist': return '치료사';
      case 'social_worker': return '사회복지사';
      case 'org_admin': return '관리자';
      default: return type ?? '직원';
    }
  };

  const s = staff as any;

  return (
    <>
      <Stack.Screen options={{ title: '직원 상세' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* 직원 프로필 카드 */}
        <View style={styles.heroCard}>
          <Image source={Avatars.nurse} style={styles.avatar} />
          <Text style={styles.heroName}>{s?.user?.full_name ?? '직원'}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{getStaffTypeLabel(s?.staff_type)}</Text>
          </View>
          <View style={[
            styles.activeBadge,
            { backgroundColor: s?.is_active ? `${Colors.secondary}20` : `${Colors.error}20` },
          ]}>
            <Text style={[
              styles.activeText,
              { color: s?.is_active ? Colors.secondary : Colors.error },
            ]}>
              {s?.is_active ? '활성' : '비활성'}
            </Text>
          </View>
        </View>

        {/* 상세 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>상세 정보</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>연락처</Text>
              <Text style={styles.infoValue}>{s?.user?.phone ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>이메일</Text>
              <Text style={styles.infoValue}>{s?.user?.email ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>면허번호</Text>
              <Text style={styles.infoValue}>{s?.license_number ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>전문분야</Text>
              <Text style={styles.infoValue}>
                {s?.specialties?.join(', ') ?? '-'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>최대 담당</Text>
              <Text style={styles.infoValue}>{s?.max_patients ?? '-'}명</Text>
            </View>
          </View>
        </View>

        {/* 이번 달 통계 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>이번 달 통계</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{monthlyStats?.total ?? 0}</Text>
              <Text style={styles.statLabel}>전체 방문</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: Colors.secondary }]}>
                {monthlyStats?.completed ?? 0}
              </Text>
              <Text style={styles.statLabel}>완료</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: Colors.secondary }]}>
                {monthlyStats?.completionRate ?? 0}%
              </Text>
              <Text style={styles.statLabel}>완료율</Text>
            </View>
          </View>
        </View>

        {/* 담당 환자 리스트 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>담당 환자 ({(assignedPatients ?? []).length}명)</Text>
          </View>
          {(assignedPatients ?? []).length > 0 ? (
            (assignedPatients ?? []).map((patient: any) => (
              <View key={patient.id} style={styles.patientCard}>
                <Image
                  source={getPatientAvatar(patient.gender)}
                  style={styles.patientAvatar}
                />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.user?.full_name ?? '이름없음'}</Text>
                  <Text style={styles.patientPhone}>{patient.user?.phone ?? ''}</Text>
                </View>
                {patient.care_level && (
                  <View style={styles.careLevelBadge}>
                    <Text style={styles.careLevelText}>{patient.care_level}등급</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>담당 환자가 없습니다</Text>
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
    marginBottom: Spacing.md,
  },
  heroName: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    backgroundColor: `${Colors.onPrimary}20`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  typeText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  activeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xl,
  },
  activeText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
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
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  infoValue: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.ambient,
  },
  statNumber: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  patientCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  patientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: Spacing.md,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  patientPhone: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  careLevelBadge: {
    backgroundColor: `${Colors.secondary}15`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  careLevelText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.secondary,
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
