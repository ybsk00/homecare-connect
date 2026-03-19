import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useOrganizationDetail, useSelectOrganization } from '@/hooks/useMatching';
import { colors, spacing, radius, shadows, typography } from '@/constants/theme';
import {
  formatOrgType,
  formatServiceType,
  formatPhoneNumber,
  formatDate,
} from '@homecare/shared-utils';
import type { Tables } from '@homecare/shared-types';

type ReviewWithGuardian = Tables<'reviews'> & {
  guardian?: { full_name: string } | null;
};

export default function OrgDetailScreen() {
  const router = useRouter();
  const { orgId, requestId } = useLocalSearchParams<{
    orgId: string;
    requestId?: string;
  }>();

  const orgQuery = useOrganizationDetail(orgId ?? null);
  const selectOrg = useSelectOrganization();
  const org = orgQuery.data;

  const handleSelect = () => {
    if (!requestId || !orgId) return;

    Alert.alert(
      '기관 선택',
      `${org?.name ?? '이 기관'}을 선택하시겠습니까?\n선택 후 기관에 요청이 전송됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '선택',
          onPress: async () => {
            try {
              await selectOrg.mutateAsync({ requestId, orgId });
              Alert.alert('요청 전송', '기관에 요청이 전송되었습니다. 48시간 내 응답을 기다려 주세요.', [
                { text: '확인', onPress: () => router.replace('/(tabs)/matching') },
              ]);
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : '기관 선택에 실패했습니다.';
              Alert.alert('오류', message);
            }
          },
        },
      ],
    );
  };

  if (orgQuery.isLoading) {
    return <Loading fullScreen message="기관 정보 불러오는 중..." />;
  }

  if (!org) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>기관 정보를 불러올 수 없습니다</Text>
      </View>
    );
  }

  const reviews = ((org as any).reviews ?? []) as ReviewWithGuardian[];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero section */}
      <Card style={styles.heroCard}>
        <Text style={styles.orgName}>{org.name}</Text>
        <Badge text={formatOrgType(org.org_type)} variant="primary" size="md" />
        <Text style={styles.address}>{org.address}</Text>
        {org.address_detail && (
          <Text style={styles.addressDetail}>{org.address_detail}</Text>
        )}
        <Text style={styles.phone}>{formatPhoneNumber(org.phone)}</Text>
      </Card>

      {/* Rating in teal */}
      <Card style={styles.ratingCard}>
        <View style={styles.ratingRow}>
          <View style={styles.ratingMain}>
            <Text style={styles.ratingNumber}>{org.rating_avg.toFixed(1)}</Text>
            <View style={styles.ratingChip}>
              <Text style={styles.ratingChipText}>
                리뷰 {org.review_count}개
              </Text>
            </View>
          </View>
          <View style={styles.ratingStats}>
            <RatingStat label="정시 방문" value={`${Math.round(org.punctuality_rate * 100)}%`} />
            <RatingStat label="평균 응답" value={`${org.response_avg_hours.toFixed(0)}시간`} />
            <RatingStat label="활성 환자" value={`${org.active_patient_count}명`} />
          </View>
        </View>
      </Card>

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>제공 서비스</Text>
        <View style={styles.serviceTags}>
          {org.services.map((svc) => (
            <Badge key={svc} text={formatServiceType(svc)} variant="primary" size="md" />
          ))}
        </View>
      </View>

      {/* Description */}
      {org.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기관 소개</Text>
          <Card>
            <Text style={styles.description}>{org.description}</Text>
          </Card>
        </View>
      )}

      {/* Operating hours */}
      {org.operating_hours && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>운영 시간</Text>
          <Card>
            {Object.entries(org.operating_hours).map(([day, hours]) => (
              <View key={day} style={styles.hoursRow}>
                <Text style={styles.hoursDay}>{day}</Text>
                <Text style={styles.hoursTime}>
                  {(hours as { start: string; end: string }).start} - {(hours as { start: string; end: string }).end}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>최근 리뷰</Text>
        {reviews.length === 0 ? (
          <Card>
            <Text style={styles.noReview}>아직 리뷰가 없습니다</Text>
          </Card>
        ) : (
          reviews.slice(0, 5).map((review: ReviewWithGuardian) => (
            <Card key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>
                  {review.guardian?.full_name ?? '보호자'}
                </Text>
                <View style={styles.reviewRatingChip}>
                  <Text style={styles.reviewRatingText}>
                    {review.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
              {review.content && (
                <Text style={styles.reviewContent}>{review.content}</Text>
              )}
              <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
            </Card>
          ))
        )}
      </View>

      {/* Map placeholder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>위치</Text>
        <Card style={styles.mapPlaceholder}>
          <Text style={styles.mapText}>지도 (추후 구현 예정)</Text>
          <Text style={styles.mapSubtext}>서비스 반경: {org.service_area_km}km</Text>
        </Card>
      </View>

      {/* CTA - gradient button */}
      {requestId && (
        <View style={styles.actionSection}>
          <Button
            title="이 기관 선택하기"
            onPress={handleSelect}
            loading={selectOrg.isPending}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </ScrollView>
  );
}

function RatingStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={ratingStatStyles.stat}>
      <Text style={ratingStatStyles.value}>{value}</Text>
      <Text style={ratingStatStyles.label}>{label}</Text>
    </View>
  );
}

const ratingStatStyles = StyleSheet.create({
  stat: { alignItems: 'center' },
  value: {
    ...typography.bodyBold,
  },
  label: {
    ...typography.small,
    marginTop: spacing.xs,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.error },

  heroCard: { marginBottom: spacing.xl },
  orgName: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  address: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  addressDetail: {
    ...typography.small,
  },
  phone: {
    ...typography.captionMedium,
    color: colors.secondary,
    marginTop: spacing.md,
  },

  ratingCard: { marginBottom: spacing.xxl },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingMain: { marginRight: spacing.xl },
  ratingNumber: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.onSurface,
    letterSpacing: -1,
  },
  ratingChip: {
    backgroundColor: colors.vital.normal.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  ratingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  ratingStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },

  section: { marginBottom: spacing.xxl },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  serviceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  description: {
    ...typography.koreanBody,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  hoursDay: {
    ...typography.label,
  },
  hoursTime: {
    ...typography.caption,
  },
  noReview: {
    ...typography.caption,
    textAlign: 'center',
  },
  reviewCard: { marginBottom: spacing.sm },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reviewAuthor: {
    ...typography.label,
  },
  reviewRatingChip: {
    backgroundColor: colors.vital.normal.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  reviewRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  reviewContent: {
    ...typography.koreanCaption,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  reviewDate: {
    ...typography.small,
  },
  mapPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  mapText: {
    ...typography.bodyBold,
    color: colors.onSurfaceVariant,
  },
  mapSubtext: {
    ...typography.small,
    marginTop: spacing.xs,
  },
  actionSection: { marginTop: spacing.md },
});
