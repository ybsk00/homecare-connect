import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { useAIReportDetail } from '@/hooks/useAIReports';
import { colors, spacing, radius, typography } from '@/constants/theme';

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

export default function AIReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const reportQuery = useAIReportDetail(reportId ?? null);
  const report = reportQuery.data as any;

  if (reportQuery.isLoading) {
    return <Loading fullScreen message="AI 리포트 불러오는 중..." />;
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>리포트를 불러올 수 없습니다</Text>
      </View>
    );
  }

  const patient = report.patient;
  const patientName = Array.isArray(patient) ? patient[0]?.full_name : patient?.full_name;
  const patientDiagnosis = Array.isArray(patient) ? patient[0]?.primary_diagnosis : patient?.primary_diagnosis;
  const org = report.organization;
  const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
  const doctor = report.doctor;
  const doctorProfile = doctor?.user;
  const doctorName = Array.isArray(doctorProfile)
    ? doctorProfile[0]?.full_name
    : doctorProfile?.full_name;

  const keyEvents: Array<{ date?: string; event: string; severity?: string }> =
    report.key_events ?? [];
  const vitalsAnalysis: Record<string, any> = report.vitals_analysis ?? {};

  const periodStart = new Date(report.period_start).toLocaleDateString('ko-KR');
  const periodEnd = new Date(report.period_end).toLocaleDateString('ko-KR');

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={reportQuery.isRefetching}
          onRefresh={() => reportQuery.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {/* 환자 정보 헤더 */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            {patientName && <Text style={styles.patientName}>{patientName}</Text>}
            {orgName && <Text style={styles.orgName}>{orgName}</Text>}
            {patientDiagnosis && (
              <Text style={styles.diagnosisText}>{patientDiagnosis}</Text>
            )}
          </View>
          <Badge
            text={getReportStatusLabel(report.status)}
            variant={getReportStatusVariant(report.status)}
            size="md"
          />
        </View>
      </Card>

      {/* 기간 */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>리포트 기간</Text>
        <Text style={styles.periodText}>
          {periodStart} ~ {periodEnd}
        </Text>
      </Card>

      {/* AI 요약 */}
      {report.ai_summary && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>AI 건강 요약</Text>
          <Text style={styles.bodyText}>{report.ai_summary}</Text>
        </Card>
      )}

      {/* 의사 소견 (쉬운 말 버전) */}
      {report.doctor_opinion_simple && (
        <Card style={[styles.section, styles.doctorCard] as any}>
          <View style={styles.doctorHeader}>
            <Text style={styles.doctorTitle}>의사 소견</Text>
            {doctorName && (
              <Text style={styles.doctorName}>{doctorName} 의사</Text>
            )}
          </View>
          <Text style={styles.doctorText}>{report.doctor_opinion_simple}</Text>
        </Card>
      )}

      {/* 주요 이벤트 */}
      {keyEvents.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>주요 이벤트</Text>
          {keyEvents.map((event, idx) => (
            <View key={idx} style={styles.eventItem}>
              <View style={styles.eventDot} />
              <View style={styles.eventContent}>
                {event.date && (
                  <Text style={styles.eventDate}>
                    {new Date(event.date).toLocaleDateString('ko-KR')}
                  </Text>
                )}
                <Text style={styles.eventText}>{event.event}</Text>
                {event.severity && (
                  <Badge
                    text={event.severity}
                    variant={
                      event.severity === 'high' || event.severity === 'critical'
                        ? 'danger'
                        : event.severity === 'medium'
                          ? 'warning'
                          : 'info'
                    }
                  />
                )}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* 바이탈 분석 */}
      {Object.keys(vitalsAnalysis).length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>바이탈 분석</Text>
          {Object.entries(vitalsAnalysis).map(([key, value]: [string, any]) => (
            <View key={key} style={styles.vitalItem}>
              <Text style={styles.vitalLabel}>{formatVitalLabel(key)}</Text>
              {typeof value === 'object' && value !== null ? (
                <View style={styles.vitalValues}>
                  {value.avg !== undefined && (
                    <Text style={styles.vitalValue}>평균: {value.avg}</Text>
                  )}
                  {value.min !== undefined && value.max !== undefined && (
                    <Text style={styles.vitalRange}>
                      범위: {value.min} ~ {value.max}
                    </Text>
                  )}
                  {value.trend && (
                    <Badge
                      text={value.trend === 'improving' ? '개선' : value.trend === 'stable' ? '안정' : '주의'}
                      variant={value.trend === 'improving' ? 'success' : value.trend === 'stable' ? 'info' : 'warning'}
                    />
                  )}
                </View>
              ) : (
                <Text style={styles.vitalValue}>{String(value)}</Text>
              )}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function formatVitalLabel(key: string): string {
  const labels: Record<string, string> = {
    blood_pressure: '혈압',
    heart_rate: '심박수',
    temperature: '체온',
    spo2: '산소포화도',
    blood_sugar: '혈당',
    weight: '체중',
    respiration_rate: '호흡수',
  };
  return labels[key] ?? key;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.error },

  headerCard: { marginBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: { flex: 1, marginRight: spacing.md },
  patientName: {
    ...typography.subtitle,
    marginBottom: spacing.xs,
  },
  orgName: {
    ...typography.captionMedium,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  diagnosisText: {
    ...typography.small,
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  periodText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  bodyText: {
    ...typography.koreanBody,
  },

  doctorCard: {
    backgroundColor: colors.surfaceContainerLow,
  },
  doctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  doctorTitle: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  doctorName: {
    ...typography.small,
    color: colors.primary,
  },
  doctorText: {
    ...typography.koreanBody,
    color: colors.primary,
  },

  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
    marginRight: spacing.md,
    marginTop: spacing.sm,
  },
  eventContent: { flex: 1, gap: spacing.xs },
  eventDate: {
    ...typography.small,
    color: colors.secondary,
  },
  eventText: {
    ...typography.koreanBody,
  },

  vitalItem: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
  },
  vitalLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  vitalValues: {
    gap: spacing.xs,
  },
  vitalValue: {
    ...typography.bodyMedium,
  },
  vitalRange: {
    ...typography.caption,
  },
});
