import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { MapPin, Star, Shield, CheckCircle, Clock } from '@/components/icons/TabIcons';

export default function MatchingResultsScreen() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const [progress, setProgress] = useState(0);

  // 매칭 진행 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // 추천 기관 조회
  const { data: results, isLoading } = useQuery({
    queryKey: ['matching-results', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, org_type, address, rating, total_reviews, services')
        .eq('is_active', true)
        .order('rating', { ascending: false })
        .limit(10);
      if (error) throw error;
      // 점수 시뮬레이션
      return (data ?? []).map((org: any, idx: number) => ({
        ...org,
        matchScore: Math.max(95 - idx * 5, 60),
        distance: (1.2 + idx * 0.8).toFixed(1),
      }));
    },
    enabled: progress >= 100,
  });

  return (
    <>
      <Stack.Screen options={{ title: '매칭 결과' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 매칭 진행 상태 */}
        <View style={styles.progressSection}>
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>
              {progress < 100 ? 'AI 매칭 진행 중...' : '매칭 완료!'}
            </Text>
            <Text style={styles.progressSubtitle}>
              {progress < 100
                ? '최적의 기관을 찾고 있습니다'
                : `${results?.length ?? 0}개 기관을 추천합니다`}
            </Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
        </View>

        {/* 결과 리스트 */}
        {progress >= 100 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>추천 기관</Text>
            {isLoading ? (
              <ActivityIndicator
                color={Colors.secondary}
                style={{ paddingVertical: Spacing.xxxl }}
              />
            ) : results && results.length > 0 ? (
              <View style={styles.resultList}>
                {results.map((org: any, idx: number) => (
                  <TouchableOpacity
                    key={org.id}
                    style={styles.resultCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push(`/patient/matching/${org.id}`)
                    }
                  >
                    {idx === 0 && (
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>BEST MATCH</Text>
                      </View>
                    )}
                    <View style={styles.resultHeader}>
                      <View style={styles.resultInfo}>
                        <Text style={styles.orgName}>{org.name}</Text>
                        <Text style={styles.orgType}>
                          {org.org_type === 'hospital'
                            ? '병원'
                            : org.org_type === 'clinic'
                            ? '의원'
                            : '방문간호센터'}
                        </Text>
                      </View>
                      <View style={styles.scoreCircle}>
                        <Text style={styles.scoreText}>{org.matchScore}</Text>
                        <Text style={styles.scoreLabel}>점</Text>
                      </View>
                    </View>

                    <View style={styles.resultMeta}>
                      <View style={styles.metaItem}>
                        <MapPin color={Colors.onSurfaceVariant} size={14} />
                        <Text style={styles.metaText}>{org.distance}km</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Star color="#F59E0B" size={14} />
                        <Text style={styles.metaText}>
                          {org.rating?.toFixed(1) ?? '-'}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Shield color={Colors.onSurfaceVariant} size={14} />
                        <Text style={styles.metaText}>
                          리뷰 {org.total_reviews ?? 0}
                        </Text>
                      </View>
                    </View>

                    {org.address && (
                      <Text style={styles.address} numberOfLines={1}>
                        {org.address}
                      </Text>
                    )}

                    <TouchableOpacity
                      style={styles.selectBtn}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push(`/patient/matching/${org.id}`)
                      }
                    >
                      <Text style={styles.selectBtnText}>선택하기</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Clock color={Colors.onSurfaceVariant} size={32} />
                <Text style={styles.emptyText}>
                  매칭 가능한 기관이 없습니다
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  progressSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
    marginTop: Spacing.lg,
  },
  progressCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.hero,
  },
  progressTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  progressSubtitle: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    marginTop: Spacing.xs,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: Spacing.lg,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
    textAlign: 'right',
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
  },

  resultList: {
    gap: Spacing.lg,
  },
  resultCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.float,
  },
  bestBadge: {
    backgroundColor: Colors.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  bestBadgeText: {
    fontSize: FontSize.overline,
    fontWeight: '800',
    color: Colors.onPrimary,
    letterSpacing: 1.5,
  },

  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  orgType: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.secondary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: FontSize.subtitle,
    fontWeight: '900',
    color: Colors.secondary,
  },
  scoreLabel: {
    fontSize: FontSize.overline,
    color: Colors.secondary,
    marginTop: -2,
  },

  resultMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },

  address: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
  },

  selectBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  selectBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },

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
