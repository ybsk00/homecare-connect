import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Search, MapPin, Star, Shield, ChevronRight } from '@/components/icons/TabIcons';

export default function MatchingScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [refreshing, setRefreshing] = useState(false);

  // 연결된 환자 조회
  const { data: patients } = useQuery({
    queryKey: ['guardian-patients', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('guardian_patient_links')
        .select('patient:patients(*)')
        .eq('guardian_id', userId);
      if (error) throw error;
      return data?.map((d: any) => d.patient) ?? [];
    },
    enabled: !!userId,
  });

  const patientId = patients?.[0]?.id;

  // 진행 중인 매칭 요청
  const {
    data: activeRequests,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['matching-requests', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('patient_id', patientId)
        .in('status', ['pending', 'matching', 'matched'] as any)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

  // 추천 기관 목록
  const { data: organizations } = useQuery({
    queryKey: ['recommended-orgs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, org_type, address, rating, total_reviews')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: '대기중', color: Colors.onSurfaceVariant, bg: `${Colors.onSurfaceVariant}15` },
      matching: { label: '매칭중', color: '#F59E0B', bg: '#FEF3C7' },
      matched: { label: '매칭완료', color: Colors.secondary, bg: `${Colors.secondary}15` },
    };
    return map[status] ?? map.pending;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: 100,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>케어 매칭</Text>
        <Text style={styles.subtitle}>최적의 방문 간호 서비스를 찾아보세요</Text>
      </View>

      {/* Hero CTA 카드 */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.heroCta} activeOpacity={0.8}>
          <View style={styles.heroCtaContent}>
            <View style={styles.heroCtaIconWrap}>
              <Search color={Colors.onPrimary} size={24} />
            </View>
            <View style={styles.heroCtaTextWrap}>
              <Text style={styles.heroCtaTitle}>새 매칭 요청</Text>
              <Text style={styles.heroCtaDesc}>
                지역과 필요한 서비스를 선택하고{'\n'}AI가 최적 매칭을 진행합니다
              </Text>
            </View>
          </View>
          <ChevronRight color={Colors.onPrimary} size={24} />
        </TouchableOpacity>
      </View>

      {/* 진행 중인 요청 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>진행 중인 요청</Text>
        {isLoading ? (
          <ActivityIndicator color={Colors.secondary} style={{ paddingVertical: Spacing.xxl }} />
        ) : activeRequests && activeRequests.length > 0 ? (
          <View style={styles.requestList}>
            {activeRequests.map((req: any) => {
              const statusCfg = getStatusConfig(req.status);
              return (
                <TouchableOpacity key={req.id} style={styles.requestCard} activeOpacity={0.7}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestType}>
                      {req.service_type === 'nursing' ? '간호' : req.service_type === 'rehab' ? '재활' : '돌봄'}
                    </Text>
                    <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.statusText, { color: statusCfg.color }]}>
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.requestDate}>
                    요청일: {new Date(req.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                  {req.preferred_region && (
                    <View style={styles.requestRegion}>
                      <MapPin color={Colors.onSurfaceVariant} size={14} />
                      <Text style={styles.requestRegionText}>{req.preferred_region}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Shield color={Colors.onSurfaceVariant} size={32} />
            <Text style={styles.emptyText}>진행 중인 매칭 요청이 없습니다</Text>
          </View>
        )}
      </View>

      {/* 추천 기관 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 기관</Text>
        {organizations && organizations.length > 0 ? (
          <View style={styles.orgList}>
            {organizations.map((org: any) => (
              <TouchableOpacity key={org.id} style={styles.orgCard} activeOpacity={0.7}>
                <View style={styles.orgInfo}>
                  <Text style={styles.orgName}>{org.name}</Text>
                  <Text style={styles.orgType}>
                    {org.org_type === 'hospital' ? '병원' : org.org_type === 'clinic' ? '의원' : '방문간호센터'}
                  </Text>
                  {org.address && (
                    <View style={styles.orgAddress}>
                      <MapPin color={Colors.onSurfaceVariant} size={12} />
                      <Text style={styles.orgAddressText} numberOfLines={1}>
                        {org.address}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.orgScore}>
                  <View style={styles.ratingRow}>
                    <Star color="#F59E0B" size={16} />
                    <Text style={styles.ratingText}>
                      {org.rating?.toFixed(1) ?? '-'}
                    </Text>
                  </View>
                  <Text style={styles.reviewCount}>
                    리뷰 {org.total_reviews ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>등록된 기관이 없습니다</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },

  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },

  // Hero CTA
  heroCta: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.hero,
  },
  heroCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    flex: 1,
  },
  heroCtaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCtaTextWrap: {
    flex: 1,
  },
  heroCtaTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  heroCtaDesc: {
    fontSize: FontSize.label,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    lineHeight: 18,
  },

  // Request List
  requestList: {
    gap: Spacing.md,
  },
  requestCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  requestType: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  statusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  requestDate: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  requestRegion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  requestRegionText: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },

  // Org List
  orgList: {
    gap: Spacing.md,
  },
  orgCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  orgInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  orgName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  orgType: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  orgAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  orgAddressText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  orgScore: {
    alignItems: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  reviewCount: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Empty
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
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
