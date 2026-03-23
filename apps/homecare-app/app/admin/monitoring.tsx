import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Bot, Activity, Clock, BarChart3 } from '@/components/icons/TabIcons';

export default function AdminAIMonitoring() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch } = useQuery({
    queryKey: ['admin-ai-monitoring'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 오늘
      const { count: todayCount } = await supabase
        .from('ai_api_calls')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart);

      // 이번 주
      const { count: weekCount } = await supabase
        .from('ai_api_calls')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekStart);

      // 이번 달
      const { count: monthCount } = await supabase
        .from('ai_api_calls')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart);

      return {
        today: todayCount ?? 0,
        week: weekCount ?? 0,
        month: monthCount ?? 0,
      };
    },
  });

  const { data: agentUsage } = useQuery({
    queryKey: ['admin-ai-agent-usage'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_api_calls')
        .select('agent_type, response_time_ms')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!data) return [];

      // 에이전트별 집계
      const agentMap: Record<string, { count: number; totalTime: number }> = {};
      data.forEach((call: any) => {
        const agent = call.agent_type ?? 'unknown';
        if (!agentMap[agent]) agentMap[agent] = { count: 0, totalTime: 0 };
        agentMap[agent].count++;
        agentMap[agent].totalTime += call.response_time_ms ?? 0;
      });

      return Object.entries(agentMap).map(([agent, info]) => ({
        agent,
        count: info.count,
        avgResponseTime: info.count > 0 ? Math.round(info.totalTime / info.count) : 0,
      }));
    },
  });

  const { data: responseStats } = useQuery({
    queryKey: ['admin-ai-response-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_api_calls')
        .select('response_time_ms, status')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!data || data.length === 0) return { avg: 0, p95: 0, successRate: 0, total: 0 };

      const times = data
        .map((d: any) => d.response_time_ms ?? 0)
        .filter((t: number) => t > 0)
        .sort((a: number, b: number) => a - b);

      const avg = times.length > 0 ? Math.round(times.reduce((s: number, t: number) => s + t, 0) / times.length) : 0;
      const p95Index = Math.floor(times.length * 0.95);
      const p95 = times.length > 0 ? times[p95Index] : 0;
      const successCount = data.filter((d: any) => d.status === 'success').length;
      const successRate = data.length > 0 ? Math.round((successCount / data.length) * 100) : 0;

      return { avg, p95, successRate, total: data.length };
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getAgentLabel = (type: string) => {
    switch (type) {
      case 'matching': return 'AI 매칭';
      case 'red_flag': return '레드플래그';
      case 'simplify_opinion': return '소견 변환';
      case 'patient_chatbot': return '환자 챗봇';
      case 'nurse_assistant': return '간호사 AI';
      case 'report_generator': return '리포트 생성';
      default: return type ?? 'Unknown';
    }
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'matching': return Colors.secondary;
      case 'red_flag': return Colors.error;
      case 'simplify_opinion': return Colors.redFlag.yellow.accent;
      case 'patient_chatbot': return Colors.primary;
      case 'nurse_assistant': return Colors.secondary;
      default: return Colors.onSurfaceVariant;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'AI 모니터링' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* API 호출 통계 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>API 호출 통계</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats?.today ?? 0}</Text>
              <Text style={styles.statLabel}>오늘</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: Colors.secondary }]}>
                {stats?.week ?? 0}
              </Text>
              <Text style={styles.statLabel}>이번 주</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: Colors.primary }]}>
                {stats?.month ?? 0}
              </Text>
              <Text style={styles.statLabel}>이번 달</Text>
            </View>
          </View>
        </View>

        {/* 응답시간 통계 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>응답시간 통계</Text>
          </View>
          <View style={styles.responseCard}>
            <View style={styles.responseRow}>
              <View style={styles.responseItem}>
                <Text style={styles.responseNumber}>{responseStats?.avg ?? 0}ms</Text>
                <Text style={styles.responseLabel}>평균</Text>
              </View>
              <View style={styles.responseDivider} />
              <View style={styles.responseItem}>
                <Text style={styles.responseNumber}>{responseStats?.p95 ?? 0}ms</Text>
                <Text style={styles.responseLabel}>P95</Text>
              </View>
              <View style={styles.responseDivider} />
              <View style={styles.responseItem}>
                <Text style={[styles.responseNumber, { color: Colors.secondary }]}>
                  {responseStats?.successRate ?? 0}%
                </Text>
                <Text style={styles.responseLabel}>성공률</Text>
              </View>
            </View>
            <View style={styles.totalCallsRow}>
              <Text style={styles.totalCallsLabel}>최근 호출 수</Text>
              <Text style={styles.totalCallsValue}>{responseStats?.total ?? 0}건</Text>
            </View>
          </View>
        </View>

        {/* 에이전트별 사용량 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bot color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>에이전트별 사용량</Text>
          </View>
          {(agentUsage ?? []).length > 0 ? (
            (agentUsage ?? []).map((agent: any, idx: number) => {
              const maxCount = Math.max(...(agentUsage ?? []).map((a: any) => a.count));
              const barWidth = maxCount > 0 ? (agent.count / maxCount) * 100 : 0;

              return (
                <View key={idx} style={styles.agentCard}>
                  <View style={styles.agentHeader}>
                    <View style={[styles.agentDot, { backgroundColor: getAgentColor(agent.agent) }]} />
                    <Text style={styles.agentName}>{getAgentLabel(agent.agent)}</Text>
                    <Text style={styles.agentCount}>{agent.count}회</Text>
                  </View>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${barWidth}%`, backgroundColor: getAgentColor(agent.agent) }]} />
                  </View>
                  <View style={styles.agentMeta}>
                    <Text style={styles.agentMetaText}>
                      평균 응답: {agent.avgResponseTime}ms
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Bot color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>사용량 데이터가 없습니다</Text>
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
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
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
  responseCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  responseItem: {
    flex: 1,
    alignItems: 'center',
  },
  responseNumber: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.primary,
  },
  responseLabel: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 2,
  },
  responseDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  totalCallsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  totalCallsLabel: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  totalCallsValue: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  agentCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  agentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  agentName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
    flex: 1,
  },
  agentCount: {
    fontSize: FontSize.body,
    fontWeight: '800',
    color: Colors.primary,
  },
  barContainer: {
    height: 6,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  agentMeta: {
    flexDirection: 'row',
  },
  agentMetaText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
});
