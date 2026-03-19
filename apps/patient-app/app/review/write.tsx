import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCreateReview } from '@/hooks/useReviews';
import { useAuthStore } from '@/stores/auth-store';
import { colors, spacing, radius, typography } from '@/constants/theme';

const RATING_LABELS = [
  { key: 'quality', label: '서비스 품질' },
  { key: 'punctuality', label: '정시 방문' },
  { key: 'communication', label: '의사소통' },
  { key: 'kindness', label: '친절도' },
] as const;

function StarRating({
  rating,
  onRate,
  size = 28,
}: {
  rating: number;
  onRate: (value: number) => void;
  size?: number;
}) {
  return (
    <View style={starStyles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRate(star)}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[starStyles.star, { fontSize: size, color: star <= rating ? colors.secondary : colors.outlineVariant }]}>
            {star <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  star: {
    lineHeight: 36,
  },
});

export default function ReviewWriteScreen() {
  const { orgId, orgName, patientId } = useLocalSearchParams<{
    orgId: string;
    orgName: string;
    patientId: string;
  }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const createReviewMutation = useCreateReview();

  const [overallRating, setOverallRating] = useState(0);
  const [detailRatings, setDetailRatings] = useState({
    quality: 0,
    punctuality: 0,
    communication: 0,
    kindness: 0,
  });
  const [comment, setComment] = useState('');

  const handleDetailRating = (key: string, value: number) => {
    setDetailRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!orgId || !patientId || !user) {
      Alert.alert('오류', '필수 정보가 누락되었습니다');
      return;
    }

    if (overallRating === 0) {
      Alert.alert('알림', '전체 평점을 선택해주세요');
      return;
    }

    try {
      await createReviewMutation.mutateAsync({
        org_id: orgId,
        patient_id: patientId,
        guardian_id: user.id,
        rating: overallRating,
        rating_quality: detailRatings.quality,
        rating_punctuality: detailRatings.punctuality,
        rating_communication: detailRatings.communication,
        rating_kindness: detailRatings.kindness,
        content: comment.trim() || null,
      });
      Alert.alert('완료', '리뷰가 등록되었습니다', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('리뷰 작성 오류:', error);
      Alert.alert('오류', '리뷰 등록에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 기관 정보 */}
        <Card style={styles.headerCard}>
          <Text style={styles.orgName}>{orgName ?? '기관'}</Text>
          <Text style={styles.headerCaption}>방문 서비스에 대한 평가를 남겨주세요</Text>
        </Card>

        {/* 전체 평점 */}
        <Card style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>전체 평점</Text>
          <View style={styles.overallRatingContainer}>
            <StarRating rating={overallRating} onRate={setOverallRating} size={36} />
            <Text style={styles.ratingValue}>
              {overallRating > 0 ? `${overallRating}.0` : '-'}
            </Text>
          </View>
        </Card>

        {/* 세부 평점 */}
        <Card style={styles.detailCard}>
          <Text style={styles.sectionTitle}>세부 평가</Text>
          {RATING_LABELS.map(({ key, label }) => (
            <View key={key} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <StarRating
                rating={detailRatings[key]}
                onRate={(v) => handleDetailRating(key, v)}
                size={22}
              />
            </View>
          ))}
        </Card>

        {/* 텍스트 리뷰 */}
        <Card style={styles.commentCard}>
          <Text style={styles.sectionTitle}>상세 후기 (선택)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="서비스에 대한 의견을 자유롭게 작성해주세요"
            placeholderTextColor={colors.outlineVariant}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </Card>

        {/* 제출 버튼 */}
        <Button
          title="리뷰 등록"
          onPress={handleSubmit}
          loading={createReviewMutation.isPending}
          disabled={overallRating === 0}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  headerCard: { marginBottom: spacing.xl },
  orgName: {
    ...typography.subtitle,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  headerCaption: {
    ...typography.koreanCaption,
  },

  ratingCard: { marginBottom: spacing.xl },
  ratingLabel: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  overallRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ratingValue: {
    ...typography.title,
    color: colors.secondary,
  },

  detailCard: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.body,
  },

  commentCard: { marginBottom: spacing.xxl },
  textInput: {
    ...typography.koreanBody,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.lg,
    minHeight: 120,
  },
  charCount: {
    ...typography.small,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
});
