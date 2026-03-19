import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OrgCard } from '@/components/matching/OrgCard';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useMatchingResults } from '@/hooks/useMatching';
import { colors, spacing, typography } from '@/constants/theme';

interface MatchingResultItem {
  org_id: string;
  org_name: string;
  distance_km: number;
  total_score: number;
  service_match_score: number;
  capacity_score: number;
  reputation_score: number;
}

export default function MatchingResultsScreen() {
  const router = useRouter();
  const { requestId, patientId } = useLocalSearchParams<{
    requestId: string;
    patientId: string;
  }>();

  const resultsQuery = useMatchingResults(patientId ?? null);
  const results = resultsQuery.data ?? [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={resultsQuery.isRefetching}
          onRefresh={() => resultsQuery.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI 추천 결과</Text>
        <Text style={styles.subtitle}>
          환자의 위치, 필요 서비스, 기관 평판을 종합 분석한 결과입니다
        </Text>
      </View>

      {resultsQuery.isLoading ? (
        <Loading message="AI 매칭 결과를 분석 중..." />
      ) : results.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="매칭 결과가 없습니다"
          description="조건에 맞는 기관이 없습니다. 검색 범위를 넓혀 보세요."
          actionLabel="다시 요청하기"
          onAction={() => router.push('/matching/request')}
        />
      ) : (
        <>
          <Text style={styles.count}>
            {results.length}개 기관이 추천되었습니다
          </Text>
          {results.map((result: MatchingResultItem) => (
            <OrgCard
              key={result.org_id}
              orgId={result.org_id}
              orgName={result.org_name}
              distanceKm={result.distance_km}
              totalScore={result.total_score}
              serviceMatchScore={result.service_match_score}
              capacityScore={result.capacity_score}
              reputationScore={result.reputation_score}
              onPress={(orgId) =>
                router.push(
                  `/matching/${orgId}?requestId=${requestId ?? ''}`,
                )
              }
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  header: { marginBottom: spacing.xxl },
  title: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.koreanCaption,
  },
  count: {
    ...typography.captionMedium,
    color: colors.secondary,
    marginBottom: spacing.lg,
  },
});
