import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useNurseAIReports } from '@/hooks/useAIReports';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize } from '@/constants/theme';

const REPORT_STATUS_MAP: Record<string, { label: string; variant: 'teal' | 'navy' | 'warm' }> = {
  generating: { label: '생성 중', variant: 'navy' },
  generated: { label: '생성 완료', variant: 'teal' },
  doctor_reviewed: { label: '의사 검토 완료', variant: 'teal' },
  sent: { label: '발송 완료', variant: 'teal' },
  error: { label: '오류', variant: 'warm' },
};

function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return '-';
  return `${start} ~ ${end}`;
}

export default function AIReportListScreen() {
  const { reports, isLoading, refetch } = useNurseAIReports();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return <Loading message={'AI 리포트를 불러오는 중...'} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {'등록된 AI 리포트가 없습니다.'}
          </Text>
        </View>
      ) : (
        reports.map((report: any) => {
          const statusInfo = REPORT_STATUS_MAP[report.status] ?? {
            label: report.status,
            variant: 'navy' as const,
          };

          return (
            <Card
              key={report.id}
              style={styles.reportCard}
              onPress={() => router.push(`/ai-report/${report.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>
                    {report.patient?.full_name ?? '환자'}
                  </Text>
                  {report.patient?.care_grade && (
                    <Text style={styles.careGrade}>
                      {'등급 '}{report.patient.care_grade}
                    </Text>
                  )}
                </View>
                <Badge
                  label={statusInfo.label}
                  variant={statusInfo.variant}
                  size="sm"
                />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{'기간'}</Text>
                  <Text style={styles.infoValue}>
                    {formatPeriod(report.period_start, report.period_end)}
                  </Text>
                </View>
                {report.ai_summary && (
                  <Text style={styles.summaryText} numberOfLines={2}>
                    {report.ai_summary}
                  </Text>
                )}
                <View style={styles.tagRow}>
                  {report.doctor_confirmed && (
                    <Badge label={'의사 확인'} variant="teal" size="sm" />
                  )}
                  {report.sent_to_guardian && (
                    <Badge label={'보호자 발송'} variant="navy" size="sm" />
                  )}
                </View>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['4xl'],
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  reportCard: {
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  patientInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  patientName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  careGrade: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardBody: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    width: 50,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  tagRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
