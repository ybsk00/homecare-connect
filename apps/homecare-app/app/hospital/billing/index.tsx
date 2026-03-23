import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { DollarSign, User } from '@/components/icons/TabIcons';

type BillingStatus = 'all' | 'paid' | 'pending' | 'overdue';

const STATUS_FILTERS: { key: BillingStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'paid', label: '완료' },
  { key: 'pending', label: '대기' },
  { key: 'overdue', label: '연체' },
];

export default function HospitalBilling() {
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const [statusFilter, setStatusFilter] = useState<BillingStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: billings, refetch } = useQuery({
    queryKey: ['hospital-billing', orgId, statusFilter],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from('billings')
        .select(`
          id, amount, status, billing_date, payment_date, description,
          patient:patients(id, user:profiles!inner(full_name))
        `)
        .eq('organization_id', orgId)
        .order('billing_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const totalIncome = (billings ?? [])
    .filter((b: any) => b.status === 'paid')
    .reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.secondary;
      case 'pending': return Colors.redFlag.yellow.accent;
      case 'overdue': return Colors.error;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return '완료';
      case 'pending': return '대기';
      case 'overdue': return '연체';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <>
      <Stack.Screen options={{ title: '수납 관리' }} />
      <View style={styles.container}>
        {/* 총 수입 카드 */}
        <View style={styles.totalCard}>
          <View style={styles.totalIcon}>
            <DollarSign color={Colors.onPrimary} size={24} />
          </View>
          <View>
            <Text style={styles.totalLabel}>이번 달 총 수입</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalIncome)}</Text>
          </View>
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

        {/* 수납 리스트 */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        >
          {(billings ?? []).length > 0 ? (
            (billings ?? []).map((billing: any) => (
              <View key={billing.id} style={styles.billingCard}>
                <View style={styles.billingHeader}>
                  <View style={styles.billingInfo}>
                    <Text style={styles.patientName}>
                      {billing.patient?.user?.full_name ?? '환자'}
                    </Text>
                    {billing.description && (
                      <Text style={styles.description}>{billing.description}</Text>
                    )}
                  </View>
                  <Text style={styles.amount}>{formatCurrency(billing.amount ?? 0)}</Text>
                </View>
                <View style={styles.billingFooter}>
                  <Text style={styles.dateText}>
                    {new Date(billing.billing_date).toLocaleDateString('ko-KR')}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(billing.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(billing.status) }]}>
                      {getStatusLabel(billing.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <DollarSign color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>수납 내역이 없습니다</Text>
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
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    ...Shadows.float,
  },
  totalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    letterSpacing: -0.5,
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
  billingCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  billingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  patientName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  description: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  amount: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
  },
  billingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  dateText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
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
