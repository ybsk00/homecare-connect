import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAIReportsByPatient } from '@/hooks/useAIReports';
import { usePatientStore } from '@/stores/patient-store';
import { colors, spacing, typography } from '@/constants/theme';

function getReportStatusLabel(status: string): string {
  switch (status) {
    case 'generating':
      return '생성 중';
    case 'generated':
      return '생성 완료';
    case 'doctor_reviewed':
      return '의사 검토 완료';
    case 'sent':
      return '발송 완료';
    case 'error':
      return '오류';
    default:
      return status;
  }
}

function getReportStatusVariant(status: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'generating':
      return 'info';
    case 'generated':
      return 'warning';
    case 'doctor_reviewed':
      return 'success';
    case 'sent':
      return 'success';
    case 'error':
      return 'danger';
    default:
      return 'neutral';
  }
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const formatDate = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;
  return `${startDate.getFullYear()}.${formatDate(startDate)} ~ ${formatDate(endDate)}`;
}

export default function AIReportListScreen() {
  const router = useRouter();
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const reportsQuery = useAIReportsByPatient(selectedPatientId);
  const reports = reportsQuery.data ?? [];

  if (reportsQuery.isLoading) {
    return <Loading fullScreen message="AI 리포트 불러오는 중..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={reportsQuery.isRefetching}
            onRefresh={() => reportsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📊"
            title="AI 리포트가 없습니다"
            description="방문 기록이 쌓이면 AI가 자동으로 건강 리포트를 생성합니다"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push(`/ai-report/${item.id}`)}
          >
            <Card style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.periodText}>
                  {formatPeriod(item.period_start, item.period_end)}
                </Text>
                <Badge
                  text={getReportStatusLabel(item.status)}
                  variant={getReportStatusVariant(item.status)}
                />
              </View>
              {item.ai_summary && (
                <Text style={styles.summaryText} numberOfLines={2}>
                  {item.ai_summary}
                </Text>
              )}
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString('ko-KR')}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  reportCard: { marginBottom: spacing.md },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  periodText: {
    ...typography.bodyBold,
    flex: 1,
    marginRight: spacing.sm,
  },
  summaryText: {
    ...typography.koreanCaption,
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.small,
  },
});
