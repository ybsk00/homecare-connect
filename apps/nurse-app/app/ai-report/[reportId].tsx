import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAIReportDetail } from '@/hooks/useAIReports';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const REPORT_STATUS_MAP: Record<string, { label: string; variant: 'teal' | 'navy' | 'warm' }> = {
  generating: { label: '생성 중', variant: 'navy' },
  generated: { label: '생성 완료', variant: 'teal' },
  doctor_reviewed: { label: '의사 검토 완료', variant: 'teal' },
  sent: { label: '발송 완료', variant: 'teal' },
  error: { label: '오류', variant: 'warm' },
};

export default function AIReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { report, isLoading } = useAIReportDetail(reportId);

  if (isLoading) {
    return <Loading message={'AI 리포트를 불러오는 중...'} />;
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {'리포트를 찾을 수 없습니다.'}
        </Text>
      </View>
    );
  }

  const patient = (report as any).patient;
  const doctor = (report as any).doctor;
  const statusInfo = REPORT_STATUS_MAP[report.status] ?? {
    label: report.status,
    variant: 'navy' as const,
  };

  // AI 분석 데이터 파싱
  const vitalAnalysis = report.vitals_analysis as any;
  const keyEvents = report.key_events as any[];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* 환자 정보 헤더 */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.patientAvatar}>
            <Text style={styles.avatarText}>
              {patient?.full_name?.charAt(0) ?? '?'}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.patientName}>
              {patient?.full_name ?? '환자'}
            </Text>
            <Text style={styles.patientMeta}>
              {patient?.gender === 'male' ? '남' : patient?.gender === 'female' ? '여' : ''}
              {patient?.birth_date ? ` | ${patient.birth_date}` : ''}
              {patient?.care_grade ? ` | ${patient.care_grade}등급` : ''}
            </Text>
            {patient?.primary_diagnosis && (
              <Text style={styles.diagnosis} numberOfLines={1}>
                {patient.primary_diagnosis}
              </Text>
            )}
          </View>
          <Badge
            label={statusInfo.label}
            variant={statusInfo.variant}
            size="md"
          />
        </View>
      </Card>

      {/* 기간 */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'분석 기간'}</Text>
        <Text style={styles.periodText}>
          {report.period_start ?? '-'} ~ {report.period_end ?? '-'}
        </Text>
      </Card>

      {/* AI 요약 */}
      {report.ai_summary && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{'AI 요약'}</Text>
          <View style={styles.aiSummaryContainer}>
            <Text style={styles.bodyText}>{report.ai_summary}</Text>
          </View>
        </Card>
      )}

      {/* 바이탈 분석 */}
      {vitalAnalysis && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{'바이탈 분석'}</Text>
          {typeof vitalAnalysis === 'string' ? (
            <Text style={styles.bodyText}>{vitalAnalysis}</Text>
          ) : typeof vitalAnalysis === 'object' ? (
            <View style={styles.vitalGrid}>
              {Object.entries(vitalAnalysis).map(([key, value]) => (
                <View key={key} style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>{key}</Text>
                  <Text style={styles.vitalValue}>
                    {typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      )}

      {/* 주요 이벤트 */}
      {Array.isArray(keyEvents) && keyEvents.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {'주요 이벤트'} ({keyEvents.length})
          </Text>
          {keyEvents.map((event: any, index: number) => (
            <View key={index} style={styles.eventItem}>
              <View style={styles.eventDot} />
              <View style={styles.eventContent}>
                {event.date && (
                  <Text style={styles.eventDate}>{event.date}</Text>
                )}
                <Text style={styles.eventText}>
                  {typeof event === 'string'
                    ? event
                    : event.description ?? event.title ?? JSON.stringify(event)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* 의사 소견 */}
      {report.doctor_opinion && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{'의사 소견'}</Text>
          <View style={styles.doctorOpinionContainer}>
            {doctor?.user?.full_name && (
              <Text style={styles.doctorName}>
                {doctor.user.full_name} {'의사'}
              </Text>
            )}
            <Text style={styles.bodyText}>{report.doctor_opinion}</Text>
            {report.doctor_confirmed_at && (
              <Text style={styles.confirmedAt}>
                {'확인일: '}{report.doctor_confirmed_at.split('T')[0]}
              </Text>
            )}
          </View>
        </Card>
      )}

      {/* 보호자용 쉬운 설명 */}
      {report.doctor_opinion_simple && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{'보호자용 설명'}</Text>
          <Text style={styles.bodyText}>{report.doctor_opinion_simple}</Text>
        </Card>
      )}

      {/* 발송 정보 */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'상태 정보'}</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>{'의사 확인'}</Text>
            <Text
              style={[
                styles.statusValue,
                { color: report.doctor_confirmed ? Colors.secondary : Colors.onSurfaceVariant },
              ]}
            >
              {report.doctor_confirmed ? '확인됨' : '미확인'}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>{'보호자 발송'}</Text>
            <Text
              style={[
                styles.statusValue,
                { color: report.sent_to_guardian ? Colors.secondary : Colors.onSurfaceVariant },
              ]}
            >
              {report.sent_to_guardian ? '발송됨' : '미발송'}
            </Text>
          </View>
        </View>
      </Card>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
  },
  // Header
  headerCard: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  headerInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  patientMeta: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  diagnosis: {
    fontSize: FontSize.xs,
    color: Colors.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  // Section
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  bodyText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  // Period
  periodText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: '600',
  },
  // AI Summary
  aiSummaryContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  // Vital
  vitalGrid: {
    gap: Spacing.md,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vitalLabel: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    width: 100,
  },
  vitalValue: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    flex: 1,
  },
  // Events
  eventItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginTop: 6,
    marginRight: Spacing.md,
  },
  eventContent: {
    flex: 1,
  },
  eventDate: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: 2,
  },
  eventText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  // Doctor opinion
  doctorOpinionContainer: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  doctorName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  confirmedAt: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
  },
  // Status
  statusGrid: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  statusValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
