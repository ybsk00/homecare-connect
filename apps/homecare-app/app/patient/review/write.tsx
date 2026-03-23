import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Star, ChevronDown } from '@/components/icons/TabIcons';

const DETAIL_RATINGS = [
  { key: 'service', label: '서비스 질' },
  { key: 'punctuality', label: '시간 준수' },
  { key: 'communication', label: '소통' },
  { key: 'kindness', label: '친절도' },
];

function StarRating({
  rating,
  onRate,
  size = 28,
}: {
  rating: number;
  onRate: (n: number) => void;
  size?: number;
}) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          activeOpacity={0.6}
          onPress={() => onRate(n)}
          style={{ padding: 4 }}
        >
          <Star color={n <= rating ? '#F59E0B' : Colors.surfaceContainerHigh} size={size} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});

export default function ReviewWriteScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showOrgList, setShowOrgList] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [detailRatings, setDetailRatings] = useState<Record<string, number>>({});
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 기관 목록
  const { data: organizations } = useQuery({
    queryKey: ['user-orgs-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, org_type')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedOrg = organizations?.find((o: any) => o.id === selectedOrgId);

  const setDetailRating = (key: string, value: number) => {
    setDetailRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedOrgId) {
      Alert.alert('알림', '기관을 선택해주세요');
      return;
    }
    if (overallRating === 0) {
      Alert.alert('알림', '별점을 선택해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        organization_id: selectedOrgId,
        reviewer_id: user?.id,
        rating: overallRating,
        service_rating: detailRatings.service || null,
        punctuality_rating: detailRatings.punctuality || null,
        communication_rating: detailRatings.communication || null,
        kindness_rating: detailRatings.kindness || null,
        content: content.trim() || null,
      });

      if (error) throw error;

      Alert.alert('감사합니다', '리뷰가 등록되었습니다', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('오류', err.message || '리뷰 등록 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '리뷰 작성' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 기관 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기관 선택</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            activeOpacity={0.7}
            onPress={() => setShowOrgList(!showOrgList)}
          >
            <Text
              style={[
                styles.selectText,
                selectedOrg && styles.selectTextActive,
              ]}
            >
              {selectedOrg?.name || '기관을 선택해주세요'}
            </Text>
            <ChevronDown color={Colors.onSurfaceVariant} size={18} />
          </TouchableOpacity>
          {showOrgList && (
            <View style={styles.orgDropdown}>
              {organizations?.map((org: any) => (
                <TouchableOpacity
                  key={org.id}
                  style={[
                    styles.orgItem,
                    selectedOrgId === org.id && styles.orgItemActive,
                  ]}
                  onPress={() => {
                    setSelectedOrgId(org.id);
                    setShowOrgList(false);
                  }}
                >
                  <Text
                    style={[
                      styles.orgItemText,
                      selectedOrgId === org.id && styles.orgItemTextActive,
                    ]}
                  >
                    {org.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 전체 별점 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>전체 평점</Text>
          <View style={styles.overallRatingCard}>
            <Text style={styles.ratingBig}>{overallRating || '-'}</Text>
            <StarRating
              rating={overallRating}
              onRate={setOverallRating}
              size={36}
            />
          </View>
        </View>

        {/* 세부 평점 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>세부 평점</Text>
          <View style={styles.detailCard}>
            {DETAIL_RATINGS.map((item) => (
              <View key={item.key} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <StarRating
                  rating={detailRatings[item.key] || 0}
                  onRate={(n) => setDetailRating(item.key, n)}
                  size={22}
                />
              </View>
            ))}
          </View>
        </View>

        {/* 리뷰 내용 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>리뷰 내용</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="서비스에 대한 경험을 공유해주세요"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{content.length}/1000</Text>
        </View>

        {/* 제출 */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>리뷰 등록</Text>
            )}
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

  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },

  // Org Select
  selectBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  selectText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
  selectTextActive: {
    color: Colors.onSurface,
    fontWeight: '600',
  },
  orgDropdown: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.ambient,
  },
  orgItem: {
    padding: Spacing.lg,
  },
  orgItemActive: {
    backgroundColor: `${Colors.secondary}15`,
  },
  orgItemText: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  orgItemTextActive: {
    color: Colors.secondary,
    fontWeight: '700',
  },

  // Overall Rating
  overallRatingCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.lg,
    ...Shadows.float,
  },
  ratingBig: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.primary,
  },

  // Detail Rating
  detailCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.ambient,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },

  // Content
  contentInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    minHeight: 150,
    ...Shadows.ambient,
  },
  charCount: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // Submit
  submitSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...Shadows.hero,
  },
  submitBtnText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
});
