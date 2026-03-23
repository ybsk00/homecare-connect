import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { CreditCard, Building2 } from '@/components/icons/TabIcons';

type PlanFilter = 'all' | 'basic' | 'standard' | 'premium';

const PLAN_FILTERS: { key: PlanFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'basic', label: 'Basic' },
  { key: 'standard', label: 'Standard' },
  { key: 'premium', label: 'Premium' },
];

export default function AdminSubscriptions() {
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: subscriptions, refetch } = useQuery({
    queryKey: ['admin-subscriptions', planFilter],
    queryFn: async () => {
      let query = supabase
        .from('subscriptions')
        .select(`
          id, plan, amount, status, next_billing_date, created_at,
          organization:organizations(id, name, org_type)
        `)
        .order('created_at', { ascending: false });

      if (planFilter !== 'all') {
        query = query.eq('plan', planFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const totalMRR = (subscriptions ?? [])
    .filter((s: any) => s.status === 'active')
    .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.secondary;
      case 'cancelled': return Colors.error;
      case 'trial': return Colors.redFlag.yellow.accent;
      case 'past_due': return Colors.error;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'cancelled': return '해지';
      case 'trial': return '체험판';
      case 'past_due': return '연체';
      default: return status;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'premium': return Colors.redFlag.yellow.accent;
      case 'standard': return Colors.secondary;
      case 'basic': return Colors.onSurfaceVariant;
      default: return Colors.onSurfaceVariant;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <>
      <Stack.Screen options={{ title: '구독 관리' }} />
      <View style={styles.container}>
        {/* MRR 카드 */}
        <View style={styles.mrrCard}>
          <View style={styles.mrrIcon}>
            <CreditCard color={Colors.onPrimary} size={24} />
          </View>
          <View>
            <Text style={styles.mrrLabel}>월간 반복 수익 (MRR)</Text>
            <Text style={styles.mrrAmount}>{formatCurrency(totalMRR)}</Text>
          </View>
        </View>

        {/* 플랜 필터 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {PLAN_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, planFilter === f.key && styles.filterChipActive]}
              onPress={() => setPlanFilter(f.key)}
            >
              <Text style={[styles.filterChipText, planFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 구독 리스트 */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        >
          {(subscriptions ?? []).length > 0 ? (
            (subscriptions ?? []).map((sub: any) => (
              <View key={sub.id} style={styles.subCard}>
                <View style={styles.subHeader}>
                  <View style={styles.orgRow}>
                    <View style={styles.orgAvatar}>
                      <Building2 color={Colors.onPrimary} size={16} />
                    </View>
                    <View style={styles.orgInfo}>
                      <Text style={styles.orgName}>{sub.organization?.name ?? '기관'}</Text>
                    </View>
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: `${getPlanColor(sub.plan)}15` }]}>
                    <Text style={[styles.planText, { color: getPlanColor(sub.plan) }]}>
                      {(sub.plan ?? 'basic').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.subDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>월 금액</Text>
                    <Text style={styles.detailValue}>{formatCurrency(sub.amount ?? 0)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>상태</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(sub.status)}15` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(sub.status) }]}>
                        {getStatusLabel(sub.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>다음 결제일</Text>
                    <Text style={styles.detailValue}>
                      {sub.next_billing_date
                        ? new Date(sub.next_billing_date).toLocaleDateString('ko-KR')
                        : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <CreditCard color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>구독 정보가 없습니다</Text>
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
  mrrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    ...Shadows.float,
  },
  mrrIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mrrLabel: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  mrrAmount: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    letterSpacing: -0.5,
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
  subCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orgAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  planBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  planText: {
    fontSize: FontSize.overline,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subDetails: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  detailValue: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
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
