import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { FileText, CheckCircle, XCircle, Users } from '@/components/icons/TabIcons';

type RequestStatus = 'all' | 'pending' | 'accepted' | 'rejected' | 'assigned';

const STATUS_FILTERS: { key: RequestStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'accepted', label: '수락' },
  { key: 'rejected', label: '거절' },
  { key: 'assigned', label: '배정완료' },
];

export default function HospitalRequests() {
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<RequestStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: requests, refetch } = useQuery({
    queryKey: ['hospital-requests', orgId, statusFilter],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from('service_requests')
        .select(`
          id, service_type, status, urgency, notes, created_at,
          patient:patients(id, user:profiles!inner(full_name))
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data } = await query;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error } = await supabase
        .from('service_requests')
        .update({ status } as any)
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-requests'] });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.redFlag.yellow.accent;
      case 'accepted': return Colors.secondary;
      case 'rejected': return Colors.error;
      case 'assigned': return Colors.primary;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기';
      case 'accepted': return '수락';
      case 'rejected': return '거절';
      case 'assigned': return '배정완료';
      default: return status;
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high': return '긴급';
      case 'medium': return '보통';
      case 'low': return '일반';
      default: return urgency ?? '';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return Colors.error;
      case 'medium': return Colors.redFlag.yellow.accent;
      case 'low': return Colors.secondary;
      default: return Colors.onSurfaceVariant;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '서비스 요청' }} />
      <View style={styles.container}>
        {/* 필터 칩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        >
          {(requests ?? []).length > 0 ? (
            (requests ?? []).map((req: any) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.patientName}>
                      {req.patient?.user?.full_name ?? '환자'}
                    </Text>
                    <Text style={styles.serviceType}>{req.service_type ?? '방문간호'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(req.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                      {getStatusLabel(req.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestMeta}>
                  {req.urgency && (
                    <View style={[styles.urgencyBadge, { backgroundColor: `${getUrgencyColor(req.urgency)}10` }]}>
                      <Text style={[styles.urgencyText, { color: getUrgencyColor(req.urgency) }]}>
                        {getUrgencyLabel(req.urgency)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.dateText}>
                    {new Date(req.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>

                {req.notes && <Text style={styles.notesText}>{req.notes}</Text>}

                {/* 액션 버튼 */}
                {req.status === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={() => updateStatusMutation.mutate({ requestId: req.id, status: 'accepted' })}
                    >
                      <CheckCircle color={Colors.onPrimary} size={16} />
                      <Text style={styles.actionBtnText}>수락</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => updateStatusMutation.mutate({ requestId: req.id, status: 'rejected' })}
                    >
                      <XCircle color={Colors.error} size={16} />
                      <Text style={[styles.actionBtnText, { color: Colors.error }]}>거절</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {req.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.assignBtn]}
                    onPress={() => updateStatusMutation.mutate({ requestId: req.id, status: 'assigned' })}
                  >
                    <Users color={Colors.onPrimary} size={16} />
                    <Text style={styles.actionBtnText}>간호사 배정</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <FileText color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>서비스 요청이 없습니다</Text>
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
  filterRow: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
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
  requestCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  serviceType: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  urgencyText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  dateText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  notesText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    flex: 1,
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.secondary,
  },
  rejectBtn: {
    backgroundColor: Colors.errorContainer,
  },
  assignBtn: {
    backgroundColor: Colors.primary,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  actionBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
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
