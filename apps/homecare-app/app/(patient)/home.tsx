import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Plus, MessageCircle, Phone, Clock, Activity } from '@/components/icons/TabIcons';

// 아바타 이미지
const nurseAvatar = require('@/assets/images/nurse.jpg');

// AI 활성 펄스 인디케이터
function AgentPulseDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.8, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.agentPulseContainer}>
      <Animated.View
        style={[
          styles.agentPulseOuter,
          {
            transform: [{ scale: pulse }],
            opacity: pulse.interpolate({ inputRange: [1, 1.8], outputRange: [0.5, 0] }),
          },
        ]}
      />
      <View style={styles.agentPulseDot} />
    </View>
  );
}

export default function PatientHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const displayName = profile?.full_name || '사용자';

  // 연결된 환자 목록 조회
  const {
    data: patients,
    isLoading: patientsLoading,
    refetch: refetchPatients,
  } = useQuery({
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

  const primaryPatient = patients?.[0];
  const patientId = primaryPatient?.id;
  const today = new Date().toISOString().split('T')[0];

  // 오늘 방문 일정 조회
  const { data: todayVisits, refetch: refetchVisits } = useQuery({
    queryKey: ['today-visits', patientId, today],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('*, nurse:staff(user:profiles(full_name, avatar_url))')
        .eq('patient_id', patientId)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

  // 최근 바이탈 조회
  const { data: latestVitals } = useQuery({
    queryKey: ['latest-vitals', patientId],
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

  // 최근 방문 기록 (타임라인용)
  const { data: recentVisits } = useQuery({
    queryKey: ['recent-visits', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, scheduled_date, scheduled_time, status, visit_type, nurse:staff(user:profiles(full_name))')
        .eq('patient_id', patientId)
        .in('status', ['completed', 'confirmed', 'scheduled'] as any)
        .order('scheduled_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

  const nextVisit = todayVisits?.[0];

  // 건강 점수 계산 (바이탈 기반)
  const healthScore = useMemo(() => {
    if (!latestVitals?.vitals) return 85;
    const v = latestVitals.vitals as any;
    let score = 100;
    if (v.systolic && (v.systolic > 140 || v.systolic < 90)) score -= 10;
    if (v.diastolic && (v.diastolic > 90 || v.diastolic < 60)) score -= 5;
    if (v.heart_rate && (v.heart_rate > 100 || v.heart_rate < 60)) score -= 8;
    if (v.temperature && (v.temperature > 37.5 || v.temperature < 36.0)) score -= 10;
    if (v.spo2 && v.spo2 < 95) score -= 15;
    return Math.max(score, 0);
  }, [latestVitals]);

  // 바이탈 바 차트 데이터
  const vitalBars = useMemo(() => {
    const v = (latestVitals?.vitals as any) ?? {};
    return [
      { label: '혈압', value: v.systolic ?? 120, max: 180, color: Colors.secondary },
      { label: '심박', value: v.heart_rate ?? 72, max: 150, color: Colors.primary },
      { label: '체온', value: ((v.temperature ?? 36.5) - 35) * 40, max: 120, color: '#F59E0B' },
      { label: '산소', value: v.spo2 ?? 98, max: 100, color: '#6366F1' },
    ];
  }, [latestVitals]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchPatients(), refetchVisits()]);
  }, [refetchPatients, refetchVisits]);

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
    if (status === 'in_progress') return Colors.primary;
    return Colors.onSurfaceVariant;
  };

  if (patientsLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: 100,
      }}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.secondary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Hero 인사말 */}
      <View style={styles.heroSection}>
        <Text style={styles.heroGreeting}>
          안녕하세요, {displayName} 보호자님
        </Text>
        <Text style={styles.heroSubtext}>
          어르신의 건강을 AI가 모니터링 중입니다
        </Text>
      </View>

      {/* AI 돌봄 도우미 카드 (최상단) */}
      <View style={styles.sectionContainer}>
        <TouchableOpacity
          style={styles.agentCard}
          activeOpacity={0.85}
          onPress={() => router.push('/patient/agent')}
        >
          <LinearGradient
            colors={[Colors.secondary, '#004D47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.agentCardGradient}
          >
            <View style={styles.agentCardLeft}>
              <View style={styles.agentCardIcon}>
                <Text style={{ fontSize: 36 }}>💬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.agentCardTitleRow}>
                  <Text style={styles.agentCardTitle}>AI 돌봄 도우미</Text>
                  <View style={styles.agentActiveBadge}>
                    <AgentPulseDot />
                    <Text style={styles.agentActiveText}>AI 활성</Text>
                  </View>
                </View>
                <Text style={styles.agentCardDesc}>
                  음성으로 일정 확인, 복약 알림, 건강 상담까지 — 언제든 물어보세요
                </Text>
                <View style={styles.agentChipRow}>
                  <View style={styles.agentChip}>
                    <Text style={styles.agentChipText}>📅 일정</Text>
                  </View>
                  <View style={styles.agentChip}>
                    <Text style={styles.agentChipText}>💊 복약</Text>
                  </View>
                  <View style={styles.agentChip}>
                    <Text style={styles.agentChipText}>🏥 상담</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.agentCardArrow}>
              <Text style={{ color: Colors.onPrimary, fontSize: 20 }}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 빠른 액션 버튼 */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/(patient)/matching')}
        >
          <View style={styles.quickActionIconWrap}>
            <Plus color={Colors.onPrimary} size={20} />
          </View>
          <Text style={styles.quickActionLabel}>새 케어</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/(patient)/mypage')}
        >
          <View style={[styles.quickActionIconWrap, styles.quickActionSecondary]}>
            <MessageCircle color={Colors.onPrimary} size={20} />
          </View>
          <Text style={styles.quickActionLabel}>AI 도우미</Text>
        </TouchableOpacity>
      </View>

      {/* 다음 방문 카드 */}
      <View style={styles.sectionContainer}>
        <View style={[styles.card, styles.nextVisitCard]}>
          <View style={styles.nextVisitBadge}>
            <Text style={styles.nextVisitBadgeText}>NEXT VISIT</Text>
          </View>
          {nextVisit ? (
            <View style={styles.nextVisitContent}>
              <View style={styles.nextVisitInfo}>
                <Text style={styles.nextVisitTime}>
                  {nextVisit.scheduled_time?.slice(0, 5) ?? '시간 미정'}
                </Text>
                <Text style={styles.nextVisitNurse}>
                  {(nextVisit as any)?.nurse?.user?.full_name ?? '간호사 배정중'}
                </Text>
                <Text style={styles.nextVisitType}>
                  {(nextVisit as any).visit_type === 'regular' ? '정기 방문' : '특별 방문'}
                </Text>
              </View>
              <View style={styles.nextVisitRight}>
                <Image
                  source={nurseAvatar}
                  style={styles.nurseAvatar}
                  defaultSource={nurseAvatar}
                />
                <TouchableOpacity style={styles.phoneBtn} activeOpacity={0.7}>
                  <Phone color={Colors.secondary} size={18} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nextVisitEmpty}>
              <Text style={styles.nextVisitEmptyText}>
                오늘 예정된 방문이 없습니다
              </Text>
              <TouchableOpacity
                style={styles.requestBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/(patient)/matching')}
              >
                <Text style={styles.requestBtnText}>방문 요청하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* 건강 점수 카드 */}
      <View style={styles.sectionContainer}>
        <View style={[styles.card, styles.healthCard]}>
          <View style={styles.healthHeader}>
            <View>
              <Text style={styles.healthLabel}>건강 점수</Text>
              <Text style={styles.healthScore}>{healthScore}점</Text>
            </View>
            <View style={styles.healthChip}>
              <Text style={styles.healthChipText}>
                {healthScore >= 80 ? '양호' : healthScore >= 60 ? '주의' : '위험'}
              </Text>
            </View>
          </View>
          <View style={styles.vitalBars}>
            {vitalBars.map((bar) => (
              <View key={bar.label} style={styles.vitalBarItem}>
                <Text style={styles.vitalBarLabel}>{bar.label}</Text>
                <View style={styles.vitalBarTrack}>
                  <View
                    style={[
                      styles.vitalBarFill,
                      {
                        width: `${Math.min((bar.value / bar.max) * 100, 100)}%`,
                        backgroundColor: bar.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 케어 타임라인 */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>케어 타임라인</Text>
        <View style={styles.timeline}>
          {recentVisits && recentVisits.length > 0 ? (
            recentVisits.map((visit: any, index: number) => (
              <View key={visit.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: getStatusColor(visit.status) },
                    ]}
                  />
                  {index < (recentVisits?.length ?? 0) - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineRow}>
                    <Text style={styles.timelineDate}>
                      {visit.scheduled_date}
                    </Text>
                    <View
                      style={[
                        styles.timelineStatusChip,
                        { backgroundColor: `${getStatusColor(visit.status)}15` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.timelineStatusText,
                          { color: getStatusColor(visit.status) },
                        ]}
                      >
                        {getStatusLabel(visit.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.timelineNurse}>
                    {visit.nurse?.user?.full_name ?? '간호사 미정'}
                  </Text>
                  <Text style={styles.timelineTime}>
                    {visit.scheduled_time?.slice(0, 5) ?? ''}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyTimeline}>
              <Clock color={Colors.onSurfaceVariant} size={32} />
              <Text style={styles.emptyTimelineText}>
                아직 방문 기록이 없습니다
              </Text>
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  heroSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  heroGreeting: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  heroSubtext: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
    letterSpacing: -0.2,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionSecondary: {
    backgroundColor: Colors.secondary,
  },
  quickActionLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },

  // Section
  sectionContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },

  // Card
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },

  // Next Visit
  nextVisitCard: {
    overflow: 'hidden',
  },
  nextVisitBadge: {
    backgroundColor: Colors.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
  },
  nextVisitBadgeText: {
    fontSize: FontSize.overline,
    fontWeight: '800',
    color: Colors.onPrimary,
    letterSpacing: 1.5,
  },
  nextVisitContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextVisitInfo: {
    flex: 1,
  },
  nextVisitTime: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
  },
  nextVisitNurse: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
    marginTop: Spacing.xs,
  },
  nextVisitType: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  nextVisitRight: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nurseAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  phoneBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${Colors.secondary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextVisitEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  nextVisitEmptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.lg,
  },
  requestBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  requestBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },

  // Health Score
  healthCard: {},
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  healthLabel: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  healthScore: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: -4,
    letterSpacing: -1,
  },
  healthChip: {
    backgroundColor: `${Colors.secondary}15`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
  },
  healthChipText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.secondary,
  },
  vitalBars: {
    gap: Spacing.md,
  },
  vitalBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  vitalBarLabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    width: 32,
    fontWeight: '600',
  },
  vitalBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  vitalBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Timeline
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 72,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDate: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  timelineStatusChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  timelineStatusText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  timelineNurse: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    marginTop: 4,
  },
  timelineTime: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyTimelineText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },

  // AI 에이전트 카드
  agentCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.hero,
  },
  agentCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    minHeight: 140,
  },
  agentCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    flex: 1,
  },
  agentCardIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  agentCardTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  agentCardDesc: {
    fontSize: FontSize.label,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  agentCardArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  agentActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  agentActiveText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: '#4ADE80',
  },
  agentChipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  agentChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
  },
  agentChipText: {
    fontSize: FontSize.label,
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  // 에이전트 펄스 인디케이터
  agentPulseContainer: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentPulseOuter: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
  },
  agentPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
});
