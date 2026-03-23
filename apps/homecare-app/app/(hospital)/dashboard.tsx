import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Clock, AlertTriangle, CheckCircle, Users } from '@/components/icons/TabIcons';
import { useState, useCallback } from 'react';

export default function HospitalDashboard() {
  const insets = useSafeAreaInsets();
  const { profile, staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const [refreshing, setRefreshing] = useState(false);

  // 서비스 요청 통계
  const { data: requestStats, refetch: refetchStats } = useQuery({
    queryKey: ['hospital-request-stats', orgId],
    queryFn: async () => {
      if (!orgId) return { pending: 0, inProgress: 0, completed: 0 };

      const { data: requests } = await supabase
        .from('service_requests')
        .select('status')
        .eq('organization_id', orgId);

      const pending = requests?.filter(r => r.status === 'pending').length ?? 0;
      const inProgress = requests?.filter(r => r.status === 'approved').length ?? 0;
      const completed = requests?.filter(r => r.status === 'completed').length ?? 0;

      return { pending, inProgress, completed };
    },
    enabled: !!orgId,
  });

  // 레드플래그 알림
  const { data: redFlags } = useQuery({
    queryKey: ['hospital-red-flags', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data } = await supabase
        .from('red_flag_alerts')
        .select(`
          id, severity, message, created_at, is_resolved,
          patient:patients!inner(id, user:profiles!inner(full_name), organization_id)
        `)
        .eq('patient.organization_id', orgId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(3);

      return data ?? [];
    },
    enabled: !!orgId,
  });

  // 최근 서비스 요청
  const { data: recentRequests, refetch: refetchRequests } = useQuery({
    queryKey: ['hospital-recent-requests', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data } = await supabase
        .from('service_requests')
        .select(`
          id, status, service_type, created_at, notes,
          patient:patients!inner(id, user:profiles!inner(full_name))
        `)
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      return data ?? [];
    },
    enabled: !!orgId,
  });

  // 오늘 방문 일정
  const { data: todayVisits } = useQuery({
    queryKey: ['hospital-today-visits', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_time, status, visit_type,
          patient:patients!inner(id, user:profiles!inner(full_name), organization_id),
          nurse:staff!inner(id, user:profiles!inner(full_name))
        `)
        .eq('patient.organization_id', orgId)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true })
        .limit(10);

      return data ?? [];
    },
    enabled: !!orgId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchRequests()]);
    setRefreshing(false);
  }, [refetchStats, refetchRequests]);

  const handleApprove = async (requestId: string) => {
    await supabase
      .from('service_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);
    refetchRequests();
    refetchStats();
  };

  const handleReject = async (requestId: string) => {
    await supabase
      .from('service_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
    refetchRequests();
    refetchStats();
  };

  const stats = requestStats ?? { pending: 0, inProgress: 0, completed: 0 };

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.lg, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요,</Text>
        <Text style={styles.name}>{profile?.full_name ?? '관리자'}님</Text>
        <Text style={styles.subtitle}>기관 관리 대시보드</Text>
      </View>

      {/* StatCard 3개 */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.redFlag.yellow.bg }]}>
          <Clock color={Colors.redFlag.yellow.accent} size={20} />
          <Text style={[styles.statNumber, { color: Colors.redFlag.yellow.text }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: Colors.redFlag.yellow.text }]}>대기</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(0, 106, 99, 0.08)' }]}>
          <Users color={Colors.secondary} size={20} />
          <Text style={[styles.statNumber, { color: Colors.secondary }]}>{stats.inProgress}</Text>
          <Text style={[styles.statLabel, { color: Colors.secondary }]}>진행중</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: Colors.surfaceContainerLow }]}>
          <CheckCircle color={Colors.onSurfaceVariant} size={20} />
          <Text style={[styles.statNumber, { color: Colors.onSurface }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: Colors.onSurfaceVariant }]}>완료</Text>
        </View>
      </View>

      {/* 레드플래그 배너 */}
      {redFlags && redFlags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>긴급 알림</Text>
          {redFlags.map((flag: any) => (
            <View
              key={flag.id}
              style={[
                styles.redFlagCard,
                {
                  backgroundColor:
                    flag.severity === 'red' ? Colors.redFlag.red.bg :
                    flag.severity === 'orange' ? Colors.redFlag.orange.bg :
                    Colors.redFlag.yellow.bg,
                },
              ]}
            >
              <AlertTriangle
                color={
                  flag.severity === 'red' ? Colors.redFlag.red.accent :
                  flag.severity === 'orange' ? Colors.redFlag.orange.accent :
                  Colors.redFlag.yellow.accent
                }
                size={18}
              />
              <View style={styles.redFlagContent}>
                <Text style={[styles.redFlagPatient, {
                  color: flag.severity === 'red' ? Colors.redFlag.red.text :
                         flag.severity === 'orange' ? Colors.redFlag.orange.text :
                         Colors.redFlag.yellow.text,
                }]}>
                  {flag.patient?.user?.full_name ?? '환자'}
                </Text>
                <Text style={[styles.redFlagMessage, {
                  color: flag.severity === 'red' ? Colors.redFlag.red.text :
                         flag.severity === 'orange' ? Colors.redFlag.orange.text :
                         Colors.redFlag.yellow.text,
                }]} numberOfLines={1}>
                  {flag.message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 최근 서비스 요청 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>대기 중인 서비스 요청</Text>
        {recentRequests && recentRequests.length > 0 ? (
          recentRequests.map((req: any) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestPatient}>{req.patient?.user?.full_name ?? '환자'}</Text>
                <Text style={styles.requestType}>{req.service_type ?? '방문간호'}</Text>
                {req.notes && <Text style={styles.requestNotes} numberOfLines={1}>{req.notes}</Text>}
                <Text style={styles.requestDate}>
                  {new Date(req.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(req.id)}
                >
                  <Text style={styles.approveBtnText}>수락</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(req.id)}
                >
                  <Text style={styles.rejectBtnText}>거절</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>대기 중인 요청이 없습니다</Text>
          </View>
        )}
      </View>

      {/* 오늘 방문 일정 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘 방문 일정</Text>
        {todayVisits && todayVisits.length > 0 ? (
          todayVisits.map((visit: any) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitTime}>
                <Text style={styles.visitTimeText}>
                  {visit.scheduled_time?.slice(0, 5) ?? '--:--'}
                </Text>
              </View>
              <View style={styles.visitInfo}>
                <Text style={styles.visitPatient}>{visit.patient?.user?.full_name ?? '환자'}</Text>
                <Text style={styles.visitNurse}>담당: {visit.nurse?.user?.full_name ?? '미배정'}</Text>
              </View>
              <View style={[styles.visitBadge, { backgroundColor: `${getVisitStatusColor(visit.status)}15` }]}>
                <Text style={[styles.visitBadgeText, { color: getVisitStatusColor(visit.status) }]}>
                  {getVisitStatusLabel(visit.status)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>오늘 예정된 방문이 없습니다</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  name: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statNumber: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.label,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
    letterSpacing: -0.3,
  },
  redFlagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  redFlagContent: {
    flex: 1,
  },
  redFlagPatient: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  redFlagMessage: {
    fontSize: FontSize.label,
    marginTop: 2,
  },
  requestCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  requestInfo: {
    flex: 1,
  },
  requestPatient: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  requestType: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  requestNotes: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  requestDate: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  requestActions: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  approveBtnText: {
    color: Colors.onPrimary,
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  rejectBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  rejectBtnText: {
    color: Colors.onSurfaceVariant,
    fontSize: FontSize.label,
    fontWeight: '600',
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
  visitTime: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.md,
  },
  visitTimeText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.primary,
  },
  visitInfo: {
    flex: 1,
  },
  visitPatient: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  visitNurse: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  visitBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  visitBadgeText: {
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
