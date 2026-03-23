import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Shield, Calendar } from '@/components/icons/TabIcons';

type ClaimStatus = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected';

const STATUS_FILTERS: { key: ClaimStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'draft', label: '작성중' },
  { key: 'submitted', label: '제출' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '반려' },
];

export default function HospitalClaims() {
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const [statusFilter, setStatusFilter] = useState<ClaimStatus>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [periodLabel, setPeriodLabel] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  });

  const { data: claims, refetch } = useQuery({
    queryKey: ['hospital-claims', orgId, statusFilter],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from('insurance_claims')
        .select(`
          id, claim_amount, status, service_type, service_date, claim_date,
          patient:patients(id, user:profiles!inner(full_name))
        `)
        .eq('organization_id', orgId)
        .order('claim_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const totalClaimAmount = (claims ?? []).reduce((sum: number, c: any) => sum + (c.claim_amount || 0), 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return Colors.onSurfaceVariant;
      case 'submitted': return Colors.redFlag.yellow.accent;
      case 'approved': return Colors.secondary;
      case 'rejected': return Colors.error;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '작성중';
      case 'submitted': return '제출';
      case 'approved': return '승인';
      case 'rejected': return '반려';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <>
      <Stack.Screen options={{ title: '건보 청구' }} />
      <View style={styles.container}>
        {/* 총 청구액 + 기간 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIcon}>
              <Shield color={Colors.onPrimary} size={24} />
            </View>
            <View style={styles.periodBadge}>
              <Calendar color={Colors.onSurfaceVariant} size={12} />
              <Text style={styles.periodText}>{periodLabel}</Text>
            </View>
          </View>
          <Text style={styles.summaryLabel}>총 청구액</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(totalClaimAmount)}</Text>
          <Text style={styles.summaryCount}>{(claims ?? []).length}건</Text>
        </View>

        {/* 필터 */}
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

        {/* 청구 리스트 */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        >
          {(claims ?? []).length > 0 ? (
            (claims ?? []).map((claim: any) => (
              <View key={claim.id} style={styles.claimCard}>
                <View style={styles.claimHeader}>
                  <View style={styles.claimInfo}>
                    <Text style={styles.patientName}>
                      {claim.patient?.user?.full_name ?? '환자'}
                    </Text>
                    <Text style={styles.serviceType}>{claim.service_type ?? '방문간호'}</Text>
                  </View>
                  <Text style={styles.claimAmount}>{formatCurrency(claim.claim_amount ?? 0)}</Text>
                </View>
                <View style={styles.claimFooter}>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>서비스일:</Text>
                    <Text style={styles.dateValue}>
                      {claim.service_date ? new Date(claim.service_date).toLocaleDateString('ko-KR') : '-'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(claim.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(claim.status) }]}>
                      {getStatusLabel(claim.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Shield color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>청구 내역이 없습니다</Text>
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
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    ...Shadows.float,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: `${Colors.onPrimary}20`,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xl,
  },
  periodText: {
    fontSize: FontSize.label,
    color: Colors.onPrimary,
    fontWeight: '600',
  },
  summaryLabel: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.onPrimary,
    letterSpacing: -1,
    marginVertical: Spacing.xs,
  },
  summaryCount: {
    fontSize: FontSize.label,
    color: Colors.onPrimaryContainer,
  },
  filterRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
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
  claimCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  claimInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  patientName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  serviceType: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  claimAmount: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dateLabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  dateValue: {
    fontSize: FontSize.label,
    color: Colors.onSurface,
    fontWeight: '600',
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
