import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

// ── 심각도 설정 ──
const severityConfig = {
  red: {
    icon: '🔴',
    label: '위험',
    bg: Colors.redFlag.red.bg,
    text: Colors.redFlag.red.text,
    accent: Colors.redFlag.red.accent,
  },
  orange: {
    icon: '🟠',
    label: '경고',
    bg: Colors.redFlag.orange.bg,
    text: Colors.redFlag.orange.text,
    accent: Colors.redFlag.orange.accent,
  },
  yellow: {
    icon: '🟡',
    label: '주의',
    bg: Colors.redFlag.yellow.bg,
    text: Colors.redFlag.yellow.text,
    accent: Colors.redFlag.yellow.accent,
  },
};

// ── 시간 포맷 ──
function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}일 전`;
}

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const { staffInfo, user } = useAuthStore();
  const nurseId = staffInfo?.id;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('all');

  // ── 레드플래그 목록 ──
  const {
    data: alerts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['nurse-all-alerts', nurseId],
    queryFn: async () => {
      if (!nurseId) return [];
      const { data, error } = await supabase
        .from('red_flag_alerts')
        .select('id, severity, category, title, description, ai_analysis, status, created_at, acknowledged_at, resolved_at, resolution_note, patient:patients(id, full_name)')
        .eq('nurse_id', nurseId)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!nurseId,
  });

  // ── 확인 처리 ──
  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('red_flag_alerts')
        .update({
          status: 'acknowledged' as any,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-all-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['nurse-alerts'] });
    },
  });

  // ── 해결 처리 ──
  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('red_flag_alerts')
        .update({
          status: 'resolved' as any,
          resolved_at: new Date().toISOString(),
          resolution_note: '간호사 확인 후 해결',
        })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-all-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['nurse-alerts'] });
    },
  });

  const handleResolve = (alertId: string) => {
    Alert.alert(
      '레드플래그 해결',
      '이 알림을 해결 처리하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '해결', style: 'default', onPress: () => resolveMutation.mutate(alertId) },
      ],
    );
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ── 필터링 ──
  const filtered = (alerts ?? []).filter((a: any) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const activeCount = (alerts ?? []).filter((a: any) => a.status === 'active').length;
  const acknowledgedCount = (alerts ?? []).filter((a: any) => a.status === 'acknowledged').length;

  if (isLoading) {
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
        <Text style={styles.headerTitle}>레드플래그 알림</Text>
        {activeCount > 0 && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>{activeCount}</Text>
          </View>
        )}
      </View>

      {/* ── 필터 탭 ── */}
      <View style={styles.filterRow}>
        {[
          { key: 'all' as const, label: '전체', count: alerts?.length ?? 0 },
          { key: 'active' as const, label: '미확인', count: activeCount },
          { key: 'acknowledged' as const, label: '확인됨', count: acknowledgedCount },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 알림 리스트 ── */}
      {filtered.length > 0 ? (
        filtered.map((alert: any) => {
          const sev = severityConfig[alert.severity as keyof typeof severityConfig] ?? severityConfig.yellow;
          return (
            <View key={alert.id} style={[styles.alertCard, { backgroundColor: sev.bg }]}>
              {/* 상단 */}
              <View style={styles.alertHeader}>
                <View style={styles.alertHeaderLeft}>
                  <Text style={styles.alertSevIcon}>{sev.icon}</Text>
                  <View style={[styles.sevBadge, { backgroundColor: sev.accent }]}>
                    <Text style={styles.sevBadgeText}>{sev.label}</Text>
                  </View>
                  <Text style={styles.alertCategory}>{alert.category}</Text>
                </View>
                <Text style={styles.alertTime}>{timeAgo(alert.created_at)}</Text>
              </View>

              {/* 내용 */}
              <Text style={[styles.alertTitle, { color: sev.text }]}>{alert.title}</Text>
              <Text style={styles.alertDesc} numberOfLines={2}>{alert.description}</Text>
              <Text style={styles.alertPatient}>
                환자: {(alert.patient as any)?.full_name ?? '알 수 없음'}
              </Text>

              {/* AI 분석 */}
              {alert.ai_analysis && (
                <View style={styles.aiBox}>
                  <Text style={styles.aiLabel}>AI 분석</Text>
                  <Text style={styles.aiText} numberOfLines={3}>{alert.ai_analysis}</Text>
                </View>
              )}

              {/* 액션 버튼 */}
              <View style={styles.alertActions}>
                {alert.status === 'active' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.ackButton]}
                    onPress={() => acknowledgeMutation.mutate(alert.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ackButtonText}>확인</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.resolveButton]}
                  onPress={() => handleResolve(alert.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resolveButtonText}>해결</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyText}>활성 알림이 없습니다</Text>
          <Text style={styles.emptySubtext}>모든 레드플래그가 해결되었습니다</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  activeBadge: {
    backgroundColor: Colors.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBadgeText: {
    fontSize: FontSize.label,
    fontWeight: '800',
    color: Colors.onPrimary,
  },

  // ── 필터 ──
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  filterTab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  filterTabTextActive: {
    color: Colors.onPrimary,
  },

  // ── 알림 카드 ──
  alertCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  alertSevIcon: {
    fontSize: 16,
  },
  sevBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  sevBadgeText: {
    fontSize: FontSize.overline,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  alertCategory: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  alertTime: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  alertTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  alertDesc: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  alertPatient: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
  },

  // ── AI 분석 ──
  aiBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  aiLabel: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  aiText: {
    fontSize: FontSize.label,
    color: Colors.onSurface,
    lineHeight: 18,
  },

  // ── 액션 버튼 ──
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ackButton: {
    backgroundColor: Colors.primary,
  },
  ackButtonText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  resolveButton: {
    backgroundColor: Colors.secondary,
  },
  resolveButtonText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },

  // ── 빈 상태 ──
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  emptySubtext: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
});
