import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Database, Bot, User, MessageCircle } from '@/components/icons/TabIcons';

type AgentFilter = 'all' | 'patient_chatbot' | 'nurse_assistant' | 'admin_assistant';

const AGENT_FILTERS: { key: AgentFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'patient_chatbot', label: '환자 챗봇' },
  { key: 'nurse_assistant', label: '간호사 어시스턴트' },
  { key: 'admin_assistant', label: '관리자 어시스턴트' },
];

export default function AdminRAG() {
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: chatLogs, refetch } = useQuery({
    queryKey: ['admin-rag-logs', agentFilter],
    queryFn: async () => {
      let query = supabase
        .from('chat_logs')
        .select(`
          id, question, answer_summary, agent_type, created_at, tokens_used,
          user:profiles!inner(full_name, role)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (agentFilter !== 'all') {
        query = query.eq('agent_type', agentFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getAgentLabel = (type: string) => {
    switch (type) {
      case 'patient_chatbot': return '환자 챗봇';
      case 'nurse_assistant': return '간호사 AI';
      case 'admin_assistant': return '관리자 AI';
      default: return type ?? 'AI';
    }
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'patient_chatbot': return Colors.secondary;
      case 'nurse_assistant': return Colors.primary;
      case 'admin_assistant': return Colors.redFlag.yellow.accent;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'guardian': return '보호자';
      case 'nurse': return '간호사';
      case 'org_admin': return '기관 관리자';
      case 'platform_admin': return '플랫폼 관리자';
      default: return role ?? '';
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'RAG 관리' }} />
      <View style={styles.container}>
        {/* 요약 */}
        <View style={styles.summaryCard}>
          <Database color={Colors.onPrimary} size={24} />
          <View>
            <Text style={styles.summaryLabel}>대화 로그</Text>
            <Text style={styles.summaryCount}>{(chatLogs ?? []).length}건</Text>
          </View>
        </View>

        {/* 에이전트 필터 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {AGENT_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, agentFilter === f.key && styles.filterChipActive]}
              onPress={() => setAgentFilter(f.key)}
            >
              <Text style={[styles.filterChipText, agentFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 대화 로그 리스트 */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        >
          {(chatLogs ?? []).length > 0 ? (
            (chatLogs ?? []).map((log: any) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <View style={styles.userRow}>
                    <View style={styles.userAvatar}>
                      <User color={Colors.onPrimary} size={14} />
                    </View>
                    <View>
                      <Text style={styles.userName}>{log.user?.full_name ?? '사용자'}</Text>
                      <Text style={styles.userRole}>{getRoleLabel(log.user?.role)}</Text>
                    </View>
                  </View>
                  <View style={[styles.agentBadge, { backgroundColor: `${getAgentColor(log.agent_type)}15` }]}>
                    <Text style={[styles.agentText, { color: getAgentColor(log.agent_type) }]}>
                      {getAgentLabel(log.agent_type)}
                    </Text>
                  </View>
                </View>

                <View style={styles.questionBox}>
                  <MessageCircle color={Colors.onSurfaceVariant} size={14} />
                  <Text style={styles.questionText} numberOfLines={2}>{log.question}</Text>
                </View>

                {log.answer_summary && (
                  <View style={styles.answerBox}>
                    <Bot color={Colors.secondary} size={14} />
                    <Text style={styles.answerText} numberOfLines={2}>{log.answer_summary}</Text>
                  </View>
                )}

                <View style={styles.logFooter}>
                  <Text style={styles.dateText}>
                    {new Date(log.created_at).toLocaleString('ko-KR')}
                  </Text>
                  {log.tokens_used && (
                    <Text style={styles.tokensText}>{log.tokens_used} tokens</Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Database color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>대화 로그가 없습니다</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    ...Shadows.float,
  },
  summaryLabel: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  summaryCount: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  filterRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  logCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  userRole: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
  },
  agentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  agentText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  questionBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  questionText: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  answerBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: `${Colors.secondary}08`,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  answerText: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
  },
  tokensText: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
});
