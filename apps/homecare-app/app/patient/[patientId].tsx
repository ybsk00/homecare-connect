import { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { getPatientAvatar } from '@/constants/avatars';
import {
  Activity,
  Calendar,
  Edit3,
  Heart,
  Shield,
  Clock,
} from '@/components/icons/TabIcons';

export default function PatientProfileScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-profile', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!patientId,
  });

  // 최근 바이탈
  const { data: latestVitals } = useQuery({
    queryKey: ['patient-vitals', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('visit_records')
        .select('vitals, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!patientId,
  });

  // 최근 방문 기록
  const { data: recentVisits } = useQuery({
    queryKey: ['patient-recent-visits', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, scheduled_date, scheduled_time, status, visit_type, nurse:staff(user:profiles(full_name))')
        .eq('patient_id', patientId)
        .order('scheduled_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!patientId,
  });

  // 서비스 플랜
  const { data: servicePlan } = useQuery({
    queryKey: ['patient-service-plan', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('service_plans')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as any;
    },
    enabled: !!patientId,
  });

  const age = useMemo(() => {
    if (!patient?.birth_date) return null;
    const birth = new Date(patient.birth_date);
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  }, [patient?.birth_date]);

  const vitals = (latestVitals?.vitals as any) ?? {};

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

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '환자 프로필' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: patient?.name ?? '환자 프로필' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 카드 */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <Image
              source={getPatientAvatar(patient?.gender)}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{patient?.name}</Text>
              <Text style={styles.profileMeta}>
                {age ? `${age}세` : ''}{' '}
                {patient?.gender === 'male' ? '남성' : patient?.gender === 'female' ? '여성' : ''}
              </Text>
              {patient?.care_level && (
                <View style={styles.careLevelChip}>
                  <Text style={styles.careLevelText}>
                    요양 {patient.care_level}등급
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
              <Edit3 color={Colors.onSurfaceVariant} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 바이탈 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 바이탈</Text>
          <View style={styles.vitalGrid}>
            <View style={[styles.vitalCard, { backgroundColor: `${Colors.error}08` }]}>
              <Heart color={Colors.error} size={20} />
              <Text style={styles.vitalValue}>
                {vitals.systolic && vitals.diastolic
                  ? `${vitals.systolic}/${vitals.diastolic}`
                  : '-'}
              </Text>
              <Text style={styles.vitalLabel}>혈압 mmHg</Text>
            </View>
            <View style={[styles.vitalCard, { backgroundColor: `${Colors.primary}08` }]}>
              <Activity color={Colors.primary} size={20} />
              <Text style={styles.vitalValue}>
                {vitals.heart_rate ?? '-'}
              </Text>
              <Text style={styles.vitalLabel}>심박 bpm</Text>
            </View>
            <View style={[styles.vitalCard, { backgroundColor: '#F59E0B08' }]}>
              <Activity color="#F59E0B" size={20} />
              <Text style={styles.vitalValue}>
                {vitals.temperature ? `${vitals.temperature}` : '-'}
              </Text>
              <Text style={styles.vitalLabel}>체온 &deg;C</Text>
            </View>
            <View style={[styles.vitalCard, { backgroundColor: `${Colors.secondary}08` }]}>
              <Shield color={Colors.secondary} size={20} />
              <Text style={styles.vitalValue}>
                {vitals.spo2 ? `${vitals.spo2}%` : '-'}
              </Text>
              <Text style={styles.vitalLabel}>산소포화도</Text>
            </View>
          </View>
          {latestVitals?.created_at && (
            <Text style={styles.vitalDate}>
              최종 측정: {new Date(latestVitals.created_at).toLocaleDateString('ko-KR')}
            </Text>
          )}
        </View>

        {/* 최근 방문 기록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 방문 기록</Text>
          {recentVisits && recentVisits.length > 0 ? (
            <View style={styles.visitList}>
              {recentVisits.map((visit: any) => (
                <TouchableOpacity
                  key={visit.id}
                  style={styles.visitCard}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/patient/visit/${visit.id}`)}
                >
                  <View style={styles.visitLeft}>
                    <Calendar color={Colors.secondary} size={18} />
                  </View>
                  <View style={styles.visitContent}>
                    <Text style={styles.visitDate}>{visit.scheduled_date}</Text>
                    <Text style={styles.visitNurse}>
                      {visit.nurse?.user?.full_name ?? '간호사 미정'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.visitStatusChip,
                      {
                        backgroundColor:
                          visit.status === 'completed'
                            ? `${Colors.secondary}15`
                            : `${Colors.onSurfaceVariant}15`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.visitStatusText,
                        {
                          color:
                            visit.status === 'completed'
                              ? Colors.secondary
                              : Colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {getStatusLabel(visit.status)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Clock color={Colors.onSurfaceVariant} size={24} />
              <Text style={styles.emptyText}>방문 기록이 없습니다</Text>
            </View>
          )}
        </View>

        {/* 서비스 플랜 */}
        {servicePlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>서비스 플랜</Text>
            <View style={styles.planCard}>
              <Text style={styles.planName}>
                {servicePlan.plan_name ?? '기본 플랜'}
              </Text>
              <Text style={styles.planPeriod}>
                {servicePlan.start_date} ~ {servicePlan.end_date ?? '진행중'}
              </Text>
              {servicePlan.visit_frequency && (
                <Text style={styles.planFrequency}>
                  주 {servicePlan.visit_frequency}회 방문
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },

  // Profile
  profileCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadows.float,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  profileName: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
  },
  profileMeta: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  careLevelChip: {
    backgroundColor: `${Colors.secondary}15`,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  careLevelText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.secondary,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Vitals
  vitalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  vitalCard: {
    width: '47%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.ambient,
  },
  vitalValue: {
    fontSize: FontSize.title,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  vitalLabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  vitalDate: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },

  // Visits
  visitList: {
    gap: Spacing.sm,
  },
  visitCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  visitLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.secondary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  visitDate: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  visitNurse: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  visitStatusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  visitStatusText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },

  // Plan
  planCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  planName: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  planPeriod: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  planFrequency: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: Spacing.sm,
  },

  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
});
