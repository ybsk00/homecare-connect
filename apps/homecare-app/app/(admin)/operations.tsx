import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Building2, Megaphone, Ticket, CheckCircle, Clock } from '@/components/icons/TabIcons';

type SegmentTab = 'subscriptions' | 'ads' | 'complaints';

const SEGMENTS: { key: SegmentTab; label: string }[] = [
  { key: 'subscriptions', label: '구독' },
  { key: 'ads', label: '광고' },
  { key: 'complaints', label: '민원' },
];

export default function AdminOperations() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SegmentTab>('subscriptions');

  // 구독 데이터
  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select(`
          id, plan, status, amount, start_date, end_date,
          organization:organizations!inner(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      return data ?? [];
    },
    enabled: activeTab === 'subscriptions',
  });

  // 광고 데이터
  const { data: adCampaigns } = useQuery({
    queryKey: ['admin-ad-campaigns'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_campaigns')
        .select('id, title, status, budget, impressions, clicks, start_date, end_date')
        .order('created_at', { ascending: false })
        .limit(20);

      return data ?? [];
    },
    enabled: activeTab === 'ads',
  });

  // 민원 데이터
  const { data: complaints } = useQuery({
    queryKey: ['admin-complaints'],
    queryFn: async () => {
      const { data } = await supabase
        .from('complaints')
        .select(`
          id, title, status, priority, category, created_at,
          reporter:profiles!inner(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      return data ?? [];
    },
    enabled: activeTab === 'complaints',
  });

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free': return '무료';
      case 'basic': return '베이직';
      case 'standard': return '스탠다드';
      case 'premium': return '프리미엄';
      default: return plan ?? '-';
    }
  };

  const getSubStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.secondary;
      case 'trial': return Colors.redFlag.yellow.accent;
      case 'cancelled': return Colors.error;
      case 'expired': return Colors.onSurfaceVariant;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getSubStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'trial': return '체험';
      case 'cancelled': return '취소';
      case 'expired': return '만료';
      default: return status ?? '-';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return Colors.error;
      case 'medium': return Colors.redFlag.orange.accent;
      case 'low': return Colors.onSurfaceVariant;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '긴급';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return priority ?? '-';
    }
  };

  const getComplaintStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return '접수';
      case 'in_progress': return '처리중';
      case 'resolved': return '해결';
      case 'closed': return '종료';
      default: return status ?? '-';
    }
  };

  const getComplaintStatusColor = (status: string) => {
    switch (status) {
      case 'open': return Colors.error;
      case 'in_progress': return Colors.redFlag.yellow.accent;
      case 'resolved': return Colors.secondary;
      case 'closed': return Colors.onSurfaceVariant;
      default: return Colors.onSurfaceVariant;
    }
  };

  const formatAmount = (amount: number | null) => {
    if (amount == null) return '-';
    return `${amount.toLocaleString()}원`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>운영 관리</Text>
      </View>

      {/* 세그먼트 탭 */}
      <View style={styles.segmentRow}>
        {SEGMENTS.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.segmentBtn, activeTab === s.key && styles.segmentBtnActive]}
            onPress={() => setActiveTab(s.key)}
          >
            <Text style={[styles.segmentText, activeTab === s.key && styles.segmentTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {/* 구독 탭 */}
        {activeTab === 'subscriptions' && (
          <>
            {(subscriptions ?? []).length > 0 ? (
              (subscriptions ?? []).map((sub: any) => (
                <View key={sub.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}>
                      <Building2 color={Colors.secondary} size={18} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{sub.organization?.name ?? '기관'}</Text>
                      <Text style={styles.cardSubtitle}>{getPlanLabel(sub.plan)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${getSubStatusColor(sub.status)}15` }]}>
                      <Text style={[styles.badgeText, { color: getSubStatusColor(sub.status) }]}>
                        {getSubStatusLabel(sub.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.amount}>{formatAmount(sub.amount)}/월</Text>
                    <Text style={styles.dateRange}>
                      {sub.start_date ? new Date(sub.start_date).toLocaleDateString('ko-KR') : '-'} ~{' '}
                      {sub.end_date ? new Date(sub.end_date).toLocaleDateString('ko-KR') : '계속'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>구독 데이터가 없습니다</Text>
              </View>
            )}
          </>
        )}

        {/* 광고 탭 */}
        {activeTab === 'ads' && (
          <>
            {(adCampaigns ?? []).length > 0 ? (
              (adCampaigns ?? []).map((ad: any) => (
                <View key={ad.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: `${Colors.redFlag.yellow.accent}15` }]}>
                      <Megaphone color={Colors.redFlag.yellow.accent} size={18} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{ad.title ?? '광고 캠페인'}</Text>
                      <Text style={styles.cardSubtitle}>
                        예산: {formatAmount(ad.budget)}
                      </Text>
                    </View>
                    <View style={[styles.badge, {
                      backgroundColor: ad.status === 'active'
                        ? `${Colors.secondary}15`
                        : Colors.surfaceContainerLow,
                    }]}>
                      <Text style={[styles.badgeText, {
                        color: ad.status === 'active' ? Colors.secondary : Colors.onSurfaceVariant,
                      }]}>
                        {ad.status === 'active' ? '진행중' : ad.status === 'paused' ? '일시중지' : '종료'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.adStats}>
                    <View style={styles.adStatItem}>
                      <Text style={styles.adStatValue}>{(ad.impressions ?? 0).toLocaleString()}</Text>
                      <Text style={styles.adStatLabel}>노출</Text>
                    </View>
                    <View style={styles.adStatItem}>
                      <Text style={styles.adStatValue}>{(ad.clicks ?? 0).toLocaleString()}</Text>
                      <Text style={styles.adStatLabel}>클릭</Text>
                    </View>
                    <View style={styles.adStatItem}>
                      <Text style={styles.adStatValue}>
                        {ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0'}%
                      </Text>
                      <Text style={styles.adStatLabel}>CTR</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>광고 캠페인이 없습니다</Text>
              </View>
            )}
          </>
        )}

        {/* 민원 탭 */}
        {activeTab === 'complaints' && (
          <>
            {(complaints ?? []).length > 0 ? (
              (complaints ?? []).map((c: any) => (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconBox, { backgroundColor: `${getPriorityColor(c.priority)}15` }]}>
                      <Ticket color={getPriorityColor(c.priority)} size={18} />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{c.title ?? '민원'}</Text>
                      <Text style={styles.cardSubtitle}>
                        {c.reporter?.full_name ?? '익명'} · {c.category ?? '일반'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={[styles.badge, { backgroundColor: `${getPriorityColor(c.priority)}15` }]}>
                      <Text style={[styles.badgeText, { color: getPriorityColor(c.priority) }]}>
                        {getPriorityLabel(c.priority)}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${getComplaintStatusColor(c.status)}15` }]}>
                      <Text style={[styles.badgeText, { color: getComplaintStatusColor(c.status) }]}>
                        {getComplaintStatusLabel(c.status)}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('ko-KR') : ''}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>접수된 민원이 없습니다</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.ambient,
  },
  segmentText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  segmentTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: `${Colors.secondary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  cardSubtitle: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  amount: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  dateRange: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    flex: 1,
    textAlign: 'right',
  },
  dateText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    flex: 1,
    textAlign: 'right',
  },
  adStats: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    gap: Spacing.lg,
  },
  adStatItem: {
    alignItems: 'center',
  },
  adStatValue: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  adStatLabel: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '500',
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
