import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Ticket, User, Send, Clock } from '@/components/icons/TabIcons';

type TicketStatus = 'received' | 'in_progress' | 'resolved';

const STATUS_OPTIONS: { key: TicketStatus; label: string; color: string }[] = [
  { key: 'received', label: '접수', color: Colors.redFlag.yellow.accent },
  { key: 'in_progress', label: '처리중', color: Colors.secondary },
  { key: 'resolved', label: '완료', color: Colors.primary },
];

export default function AdminSupportTicketDetail() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');

  const { data: ticket, refetch } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select(`
          id, title, content, status, category, priority, created_at, updated_at,
          user:profiles!inner(full_name, phone, email, role)
        `)
        .eq('id', ticketId)
        .single();
      return data;
    },
    enabled: !!ticketId,
  });

  const { data: replies } = useQuery({
    queryKey: ['ticket-replies', ticketId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ticket_replies')
        .select(`
          id, content, created_at, is_admin,
          user:profiles!inner(full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!ticketId,
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: ticketId,
        content: replyText,
        is_admin: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['ticket-replies'] });
    },
    onError: () => {
      Alert.alert('오류', '답변 전송에 실패했습니다.');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: TicketStatus) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
    },
    onError: () => {
      Alert.alert('오류', '상태 변경에 실패했습니다.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const t = ticket as any;
  const currentStatus = t?.status ?? 'received';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.error;
      case 'medium': return Colors.redFlag.yellow.accent;
      case 'low': return Colors.secondary;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '긴급';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return priority ?? '';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'guardian': return '보호자';
      case 'nurse': return '간호사';
      case 'org_admin': return '기관 관리자';
      default: return role ?? '';
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '민원 상세' }} />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        >
          {/* 민원 내용 */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketTitle}>{t?.title ?? '민원'}</Text>
              {t?.priority && (
                <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(t.priority)}15` }]}>
                  <Text style={[styles.priorityText, { color: getPriorityColor(t.priority) }]}>
                    {getPriorityLabel(t.priority)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <User color={Colors.onPrimary} size={16} />
              </View>
              <View>
                <Text style={styles.userName}>{t?.user?.full_name ?? '사용자'}</Text>
                <Text style={styles.userRole}>{getRoleLabel(t?.user?.role)}</Text>
              </View>
            </View>

            <View style={styles.dateRow}>
              <Clock color={Colors.onSurfaceVariant} size={12} />
              <Text style={styles.dateText}>
                {t?.created_at ? new Date(t.created_at).toLocaleString('ko-KR') : '-'}
              </Text>
            </View>

            {t?.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{t.category}</Text>
              </View>
            )}

            <Text style={styles.contentText}>{t?.content ?? ''}</Text>
          </View>

          {/* 상태 변경 */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>상태 변경</Text>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.statusChip,
                    currentStatus === opt.key && { backgroundColor: opt.color },
                  ]}
                  onPress={() => updateStatusMutation.mutate(opt.key)}
                  disabled={currentStatus === opt.key}
                >
                  <Text style={[
                    styles.statusChipText,
                    currentStatus === opt.key && { color: Colors.onPrimary },
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 답변 이력 */}
          <View style={styles.repliesSection}>
            <Text style={styles.sectionTitle}>답변 이력</Text>
            {(replies ?? []).length > 0 ? (
              (replies ?? []).map((reply: any) => (
                <View
                  key={reply.id}
                  style={[
                    styles.replyCard,
                    reply.is_admin && styles.adminReply,
                  ]}
                >
                  <View style={styles.replyHeader}>
                    <Text style={styles.replyAuthor}>
                      {reply.is_admin ? '관리자' : reply.user?.full_name ?? '사용자'}
                    </Text>
                    <Text style={styles.replyDate}>
                      {new Date(reply.created_at).toLocaleString('ko-KR')}
                    </Text>
                  </View>
                  <Text style={styles.replyContent}>{reply.content}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyReply}>
                <Text style={styles.emptyText}>아직 답변이 없습니다</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 답변 입력 */}
        <View style={styles.replyInputContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder="답변을 입력하세요..."
            placeholderTextColor={Colors.outlineVariant}
            value={replyText}
            onChangeText={setReplyText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !replyText.trim() && styles.sendBtnDisabled]}
            onPress={() => replyMutation.mutate()}
            disabled={!replyText.trim() || replyMutation.isPending}
          >
            <Send color={replyText.trim() ? Colors.onPrimary : Colors.outlineVariant} size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollArea: {
    flex: 1,
  },
  ticketCard: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    ...Shadows.float,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  ticketTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  priorityText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  dateText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${Colors.secondary}10`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  categoryText: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.secondary,
  },
  contentText: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    lineHeight: 24,
  },
  statusSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
  },
  statusChipText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  repliesSection: {
    paddingHorizontal: Spacing.xl,
  },
  replyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  adminReply: {
    backgroundColor: `${Colors.secondary}08`,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  replyAuthor: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  replyDate: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
  },
  replyContent: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  emptyReply: {
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
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  replyInput: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
});
