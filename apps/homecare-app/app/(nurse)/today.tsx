import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';
import { getPatientAvatar } from '@/constants/avatars';

// ── 카카오맵 딥링크 네비게이션 ──
const openNavigation = async (address: string) => {
  const kakaoMapUrl = `kakaomap://search?q=${encodeURIComponent(address)}`;
  const webUrl = `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;

  try {
    const canOpen = await Linking.canOpenURL(kakaoMapUrl);
    if (canOpen) {
      await Linking.openURL(kakaoMapUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    await Linking.openURL(webUrl);
  }
};

// ── 날짜 포맷 ──
function formatDate(date: Date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const day = days[date.getDay()];
  return `${m}월 ${d}일 (${day})`;
}

function getToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// ── AI 활성 펄스 인디케이터 ──
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
      <View style={styles.agentPulseDotInner} />
    </View>
  );
}

// ── LIVE 펄스 인디케이터 ──
function PulseDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <View style={styles.pulseContainer}>
      <Animated.View
        style={[styles.pulseOuter, { transform: [{ scale: pulse }], opacity: pulse.interpolate({ inputRange: [1, 1.6], outputRange: [0.5, 0] }) }]}
      />
      <View style={styles.pulseDot} />
    </View>
  );
}

// ── 바이탈 칩 ──
function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vitalChip}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>{value}</Text>
    </View>
  );
}

// ── 방문 상태 뱃지 ──
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    in_progress: { label: '방문 진행 중', bg: Colors.secondary, text: Colors.onPrimary },
    checked_in: { label: '체크인 완료', bg: Colors.secondary, text: Colors.onPrimary },
    en_route: { label: '이동 중', bg: Colors.tertiaryContainer, text: Colors.tertiary },
    scheduled: { label: '예정', bg: Colors.surfaceContainerHigh, text: Colors.onSurfaceVariant },
    completed: { label: '완료', bg: Colors.surfaceContainerHigh, text: Colors.onSurfaceVariant },
  };
  const c = config[status] ?? config.scheduled;
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusBadgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { staffInfo, profile } = useAuthStore();
  const nurseId = staffInfo?.id;
  const today = getToday();

  // ── 오늘 방문 목록 ──
  const {
    data: visits,
    isLoading: visitsLoading,
    refetch: refetchVisits,
  } = useQuery({
    queryKey: ['nurse-visits', nurseId, today],
    queryFn: async () => {
      if (!nurseId) return [];
      const { data, error } = await supabase
        .from('visits')
        .select('id, scheduled_date, scheduled_time, visit_order, estimated_duration_min, status, checkin_at, checkout_at, patient:patients(id, full_name, address, primary_diagnosis, care_grade, gender)')
        .eq('nurse_id', nurseId)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!nurseId,
  });

  // ── 레드플래그 알림 ──
  const { data: alerts } = useQuery({
    queryKey: ['nurse-alerts', nurseId],
    queryFn: async () => {
      if (!nurseId) return [];
      const { data, error } = await supabase
        .from('red_flag_alerts')
        .select('id, severity, title, category, status, created_at, patient:patients(full_name)')
        .eq('nurse_id', nurseId)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!nurseId,
  });

  // ── 진행 중인 방문 (LIVE 카드) ──
  const activeVisit = useMemo(
    () => visits?.find((v: any) => ['in_progress', 'checked_in', 'en_route'].includes(v.status)),
    [visits],
  );

  // ── 담당 환자 (중복 제거) ──
  const assignedPatients = useMemo(() => {
    if (!visits) return [];
    const seen = new Set<string>();
    return visits
      .filter((v: any) => {
        if (!v.patient?.id || seen.has(v.patient.id)) return false;
        seen.add(v.patient.id);
        return true;
      })
      .map((v: any) => v.patient);
  }, [visits]);

  // ── 통계 ──
  const totalVisits = visits?.length ?? 0;
  const completedVisits = visits?.filter((v: any) => v.status === 'completed').length ?? 0;
  const totalMinutes = visits?.reduce((sum: number, v: any) => sum + (v.estimated_duration_min ?? 30), 0) ?? 0;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetchVisits();
    setRefreshing(false);
  };

  if (visitsLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>오늘의 일정</Text>
        <Text style={styles.headerDate}>{formatDate(new Date())}</Text>
      </View>

      {/* ── LIVE 히어로 카드 ── */}
      {activeVisit ? (
        <LinearGradient
          colors={[Colors.primaryContainer, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroTopLeft}>
              <StatusBadge status={activeVisit.status} />
              <View style={styles.liveIndicator}>
                <PulseDot />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.heroTime}>
              {activeVisit.scheduled_time?.slice(0, 5) ?? '--:--'}
            </Text>
          </View>
          <View style={styles.heroBottom}>
            <Image
              source={getPatientAvatar((activeVisit.patient as any)?.gender)}
              style={styles.heroAvatar}
            />
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{(activeVisit.patient as any)?.full_name ?? '환자'}</Text>
              <Text style={styles.heroAddress} numberOfLines={1}>
                {(activeVisit.patient as any)?.address ?? '주소 미등록'}
              </Text>
            </View>
          </View>
          <View style={styles.heroVitalsRow}>
            <View style={styles.heroVitals}>
              <VitalChip label="심박" value="72bpm" />
              <VitalChip label="체온" value="36.5°C" />
            </View>
            {(activeVisit.patient as any)?.address && (
              <TouchableOpacity
                style={styles.navButton}
                activeOpacity={0.8}
                onPress={() => openNavigation((activeVisit.patient as any).address)}
              >
                <Text style={styles.navButtonText}>길찾기</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.noActiveCard}>
          <Text style={styles.noActiveText}>현재 진행 중인 방문이 없습니다</Text>
        </View>
      )}

      {/* ── AI 어시스턴트 카드 (최상단) ── */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/nurse/agent')} style={styles.agentCard}>
        <LinearGradient
          colors={[Colors.primary, '#001a3a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.agentCardGradient}
        >
          <View style={styles.agentCardLeft}>
            <View style={styles.agentCardIcon}>
              <Text style={{ fontSize: 36 }}>🩺</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.agentCardTitleRow}>
                <Text style={styles.agentCardTitle}>AI 어시스턴트</Text>
                <View style={styles.agentActiveBadge}>
                  <AgentPulseDot />
                  <Text style={styles.agentActiveText}>AI 활성</Text>
                </View>
              </View>
              <Text style={styles.agentCardDesc}>
                오늘 브리핑, 환자 요약, 주의사항을 음성으로 바로 확인하세요
              </Text>
              <View style={styles.agentChipRow}>
                <View style={styles.agentChip}>
                  <Text style={styles.agentChipText}>📋 브리핑</Text>
                </View>
                <View style={styles.agentChip}>
                  <Text style={styles.agentChipText}>👤 환자</Text>
                </View>
                <View style={styles.agentChip}>
                  <Text style={styles.agentChipText}>⚠️ 주의</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.agentCardArrow}>
            <Text style={{ color: Colors.onPrimary, fontSize: 20, fontWeight: '700' }}>→</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── 통계 카드 ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedVisits}/{totalVisits}</Text>
          <Text style={styles.statLabel}>총 방문</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{Math.round(totalMinutes / 60)}h {totalMinutes % 60}m</Text>
          <Text style={styles.statLabel}>예상 시간</Text>
        </View>
      </View>

      {/* ── 레드플래그 ── */}
      {alerts && alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>레드플래그</Text>
          {alerts.map((alert: any) => {
            const sevColors = Colors.redFlag[alert.severity as keyof typeof Colors.redFlag] ?? Colors.redFlag.yellow;
            const sevIcon = alert.severity === 'red' ? '🔴' : alert.severity === 'orange' ? '🟠' : '🟡';
            return (
              <View key={alert.id} style={[styles.alertItem, { backgroundColor: sevColors.bg }]}>
                <Text style={styles.alertIcon}>{sevIcon}</Text>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: sevColors.text }]}>{alert.title}</Text>
                  <Text style={styles.alertPatient}>
                    {(alert.patient as any)?.full_name ?? '환자'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 방문 일정 리스트 ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>방문 일정</Text>
        {visits && visits.length > 0 ? (
          visits.map((visit: any) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitTimeCol}>
                <Text style={styles.visitTime}>
                  {visit.scheduled_time?.slice(0, 5) ?? '--:--'}
                </Text>
                <Text style={styles.visitDuration}>
                  {visit.estimated_duration_min ?? 30}분
                </Text>
              </View>
              <View style={styles.visitInfoCol}>
                <View style={styles.visitNameRow}>
                  <Text style={styles.visitName}>{visit.patient?.full_name ?? '환자'}</Text>
                  <StatusBadge status={visit.status} />
                </View>
                <Text style={styles.visitAddress} numberOfLines={1}>
                  {visit.patient?.address ?? '주소 미등록'}
                </Text>
                {visit.patient?.primary_diagnosis && (
                  <Text style={styles.visitDiag}>{visit.patient.primary_diagnosis}</Text>
                )}
              </View>
              <View style={styles.visitActions}>
                {visit.patient?.address && (
                  <TouchableOpacity
                    style={styles.navButtonSmall}
                    activeOpacity={0.8}
                    onPress={() => openNavigation(visit.patient.address)}
                  >
                    <Text style={styles.navButtonSmallText}>길찾기</Text>
                  </TouchableOpacity>
                )}
                {visit.status === 'scheduled' && (
                  <TouchableOpacity
                    style={styles.startButton}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/nurse/visit/${visit.id}`)}
                  >
                    <Text style={styles.startButtonText}>방문시작</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>오늘 예정된 방문이 없습니다</Text>
          </View>
        )}
      </View>

      {/* ── 담당 환자 현황 ── */}
      {assignedPatients.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>담당 환자 현황</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientScroll}>
            {assignedPatients.map((p: any) => (
              <View key={p.id} style={styles.patientBubble}>
                <Image
                  source={getPatientAvatar(p.gender)}
                  style={styles.patientAvatar}
                />
                <Text style={styles.patientBubbleName} numberOfLines={1}>{p.full_name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },

  // ── 헤더 ──
  header: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },

  // ── LIVE 히어로 카드 ──
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.hero,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  heroTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: '#4ADE80',
  },
  heroTime: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.onPrimary,
    letterSpacing: -1,
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  heroAddress: {
    fontSize: FontSize.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  heroVitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroVitals: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  navButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  navButtonText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onPrimary,
  },

  // ── 바이탈 칩 ──
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  vitalLabel: {
    fontSize: FontSize.label,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  vitalValue: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },

  // ── 비활성 상태 ──
  noActiveCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  noActiveText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },

  // ── 상태 뱃지 ──
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  statusBadgeText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },

  // ── 통계 ──
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },

  // ── 섹션 ──
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },

  // ── 레드플래그 ──
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  alertIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  alertPatient: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // ── 방문 카드 ──
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  visitTimeCol: {
    alignItems: 'center',
    marginRight: Spacing.lg,
    minWidth: 52,
  },
  visitTime: {
    fontSize: FontSize.body,
    fontWeight: '800',
    color: Colors.primary,
  },
  visitDuration: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  visitInfoCol: {
    flex: 1,
  },
  visitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  visitName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  visitAddress: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  visitDiag: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    marginTop: 2,
  },
  visitActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  navButtonSmall: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  navButtonSmallText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  startButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: TouchTarget.min,
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onPrimary,
  },

  // ── 빈 상태 ──
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },

  // ── 환자 현황 스크롤 ──
  patientScroll: {
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  patientBubble: {
    alignItems: 'center',
    width: 64,
  },
  patientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: Spacing.xs,
  },
  patientBubbleName: {
    fontSize: FontSize.overline,
    fontWeight: '600',
    color: Colors.onSurface,
    textAlign: 'center',
  },

  // ── AI 에이전트 카드 ──
  agentCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
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
  agentPulseDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },

  // ── 펄스 ──
  pulseContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
});
