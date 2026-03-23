import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Megaphone, Eye, MousePointerClick, DollarSign, Building2 } from '@/components/icons/TabIcons';

export default function AdminAds() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: campaigns, refetch } = useQuery({
    queryKey: ['admin-ad-campaigns'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_campaigns')
        .select(`
          id, name, ad_type, impressions, clicks, cost, status, start_date, end_date,
          organization:organizations(id, name)
        `)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const totalAdRevenue = (campaigns ?? []).reduce((sum: number, c: any) => sum + (c.cost || 0), 0);
  const totalImpressions = (campaigns ?? []).reduce((sum: number, c: any) => sum + (c.impressions || 0), 0);
  const totalClicks = (campaigns ?? []).reduce((sum: number, c: any) => sum + (c.clicks || 0), 0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
    return num.toString();
  };

  const getAdTypeLabel = (type: string) => {
    switch (type) {
      case 'banner': return '배너';
      case 'featured': return '추천 상위노출';
      case 'search': return '검색 광고';
      default: return type ?? '일반';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.secondary;
      case 'paused': return Colors.redFlag.yellow.accent;
      case 'completed': return Colors.onSurfaceVariant;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '진행중';
      case 'paused': return '일시정지';
      case 'completed': return '종료';
      default: return status;
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '광고 관리' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* 총 광고 수입 */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueIcon}>
            <DollarSign color={Colors.onPrimary} size={24} />
          </View>
          <View>
            <Text style={styles.revenueLabel}>총 광고 수입</Text>
            <Text style={styles.revenueAmount}>{formatCurrency(totalAdRevenue)}</Text>
          </View>
        </View>

        {/* 요약 통계 */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Eye color={Colors.secondary} size={20} />
            <Text style={styles.summaryNumber}>{formatNumber(totalImpressions)}</Text>
            <Text style={styles.summaryLabel}>총 노출</Text>
          </View>
          <View style={styles.summaryCard}>
            <MousePointerClick color={Colors.secondary} size={20} />
            <Text style={styles.summaryNumber}>{formatNumber(totalClicks)}</Text>
            <Text style={styles.summaryLabel}>총 클릭</Text>
          </View>
          <View style={styles.summaryCard}>
            <Megaphone color={Colors.secondary} size={20} />
            <Text style={styles.summaryNumber}>
              {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0'}%
            </Text>
            <Text style={styles.summaryLabel}>CTR</Text>
          </View>
        </View>

        {/* 캠페인 리스트 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>캠페인 ({(campaigns ?? []).length}건)</Text>
          {(campaigns ?? []).length > 0 ? (
            (campaigns ?? []).map((campaign: any) => (
              <View key={campaign.id} style={styles.campaignCard}>
                <View style={styles.campaignHeader}>
                  <View style={styles.campaignInfo}>
                    <View style={styles.orgRow}>
                      <Building2 color={Colors.onSurfaceVariant} size={14} />
                      <Text style={styles.orgName}>{campaign.organization?.name ?? '기관'}</Text>
                    </View>
                    <Text style={styles.campaignName}>{campaign.name ?? '캠페인'}</Text>
                    <Text style={styles.adType}>{getAdTypeLabel(campaign.ad_type)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(campaign.status)}15` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(campaign.status) }]}>
                      {getStatusLabel(campaign.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricNumber}>{formatNumber(campaign.impressions ?? 0)}</Text>
                    <Text style={styles.metricLabel}>노출</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricNumber}>{formatNumber(campaign.clicks ?? 0)}</Text>
                    <Text style={styles.metricLabel}>클릭</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricNumber, { color: Colors.primary }]}>
                      {formatCurrency(campaign.cost ?? 0)}
                    </Text>
                    <Text style={styles.metricLabel}>비용</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Megaphone color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>등록된 캠페인이 없습니다</Text>
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
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    ...Shadows.float,
  },
  revenueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
  },
  revenueAmount: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadows.ambient,
  },
  summaryNumber: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  campaignCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  campaignInfo: {
    flex: 1,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  orgName: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  campaignName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  adType: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '600',
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
  metricsRow: {
    flexDirection: 'row',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: FontSize.body,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  metricLabel: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 2,
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
