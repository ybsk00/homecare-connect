import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  Shield,
  CheckCircle,
} from '@/components/icons/TabIcons';

export default function OrgDetailScreen() {
  const router = useRouter();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();

  const { data: org, isLoading } = useQuery({
    queryKey: ['org-detail', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // 리뷰 조회
  const { data: reviews } = useQuery({
    queryKey: ['org-reviews', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('*, reviewer:profiles(full_name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const handleSelect = () => {
    Alert.alert(
      '기관 선택',
      `${org?.name}을(를) 선택하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: () => {
            Alert.alert('선택 완료', '해당 기관에 서비스 요청이 전달되었습니다', [
              { text: '확인', onPress: () => router.dismissAll() },
            ]);
          },
        },
      ],
    );
  };

  const getOrgTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      hospital: '병원',
      clinic: '의원',
      nursing_center: '방문간호센터',
      welfare_center: '복지센터',
    };
    return map[type] || type;
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '기관 상세' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </>
    );
  }

  if (!org) {
    return (
      <>
        <Stack.Screen options={{ title: '기관 상세' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>기관 정보를 찾을 수 없습니다</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: org.name ?? '기관 상세' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 기관 헤더 카드 */}
        <View style={styles.section}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Building2 color={Colors.onPrimary} size={32} />
            </View>
            <Text style={styles.heroName}>{org.name}</Text>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipText}>
                {getOrgTypeLabel(org.org_type)}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Star color="#F59E0B" size={20} />
              <Text style={styles.ratingScore}>
                {org.rating?.toFixed(1) ?? '-'}
              </Text>
              <Text style={styles.reviewCount}>
                ({org.total_reviews ?? 0}개 리뷰)
              </Text>
            </View>
          </View>
        </View>

        {/* 기관 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기관 정보</Text>
          <View style={styles.infoCard}>
            {org.address && (
              <View style={styles.infoRow}>
                <MapPin color={Colors.secondary} size={18} />
                <Text style={styles.infoText}>{org.address}</Text>
              </View>
            )}
            {org.phone && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(`tel:${org.phone}`)}
              >
                <Phone color={Colors.secondary} size={18} />
                <Text style={[styles.infoText, styles.infoLink]}>
                  {org.phone}
                </Text>
              </TouchableOpacity>
            )}
            {org.email && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => Linking.openURL(`mailto:${org.email}`)}
              >
                <Mail color={Colors.secondary} size={18} />
                <Text style={[styles.infoText, styles.infoLink]}>
                  {org.email}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 서비스 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>제공 서비스</Text>
          <View style={styles.serviceGrid}>
            {['방문간호', '방문재활', '방문목욕', '방문돌봄'].map((s) => (
              <View key={s} style={styles.serviceChip}>
                <CheckCircle color={Colors.secondary} size={14} />
                <Text style={styles.serviceText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 리뷰 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>리뷰</Text>
          {reviews && reviews.length > 0 ? (
            <View style={styles.reviewList}>
              {reviews.map((review: any) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>
                      {review.reviewer?.full_name ?? '익명'}
                    </Text>
                    <View style={styles.reviewRating}>
                      <Star color="#F59E0B" size={14} />
                      <Text style={styles.reviewRatingText}>
                        {review.rating}
                      </Text>
                    </View>
                  </View>
                  {review.content && (
                    <Text style={styles.reviewContent} numberOfLines={3}>
                      {review.content}
                    </Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>아직 리뷰가 없습니다</Text>
            </View>
          )}
        </View>

        {/* 선택 버튼 */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.8}
            onPress={handleSelect}
          >
            <Text style={styles.submitBtnText}>이 기관 선택</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
  },

  // Hero
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadows.hero,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroName: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
  },
  heroChipText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  ratingScore: {
    fontSize: FontSize.title,
    fontWeight: '900',
    color: Colors.onPrimary,
  },
  reviewCount: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
  },

  // Info
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.ambient,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoText: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    flex: 1,
  },
  infoLink: {
    color: Colors.secondary,
    fontWeight: '600',
  },

  // Services
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: `${Colors.secondary}15`,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  serviceText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // Reviews
  reviewList: {
    gap: Spacing.md,
  },
  reviewCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  reviewerName: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRatingText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  reviewContent: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  reviewDate: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
  },

  // Submit
  submitSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  submitBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadows.hero,
  },
  submitBtnText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.onPrimary,
  },

  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    ...Shadows.ambient,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
});
