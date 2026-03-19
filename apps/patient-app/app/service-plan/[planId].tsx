import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useServicePlanDetail, useConsentServicePlan } from '@/hooks/useServicePlans';
import { colors, spacing, radius, typography } from '@/constants/theme';

function getPlanStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return '작성 중';
    case 'pending_consent':
      return '동의 대기';
    case 'active':
      return '진행 중';
    case 'completed':
      return '완료';
    case 'suspended':
      return '중단';
    default:
      return status;
  }
}

function getPlanStatusVariant(status: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'pending_consent':
      return 'warning';
    case 'active':
      return 'success';
    case 'completed':
      return 'info';
    case 'suspended':
      return 'danger';
    default:
      return 'neutral';
  }
}

const WEEKDAY_MAP: Record<string, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

export default function ServicePlanDetailScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const planQuery = useServicePlanDetail(planId ?? null);
  const consentMutation = useConsentServicePlan();
  const plan = planQuery.data as any;

  if (planQuery.isLoading) {
    return <Loading fullScreen message="서비스 계획 불러오는 중..." />;
  }

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>서비스 계획을 불러올 수 없습니다</Text>
      </View>
    );
  }

  const patient = plan.patient;
  const org = plan.organization;
  const nurse = plan.nurse;
  const nurseProfile = nurse?.user;
  const nurseName = Array.isArray(nurseProfile)
    ? nurseProfile[0]?.full_name
    : nurseProfile?.full_name;
  const patientName = Array.isArray(patient) ? patient[0]?.full_name : patient?.full_name;
  const orgName = Array.isArray(org) ? org[0]?.name : org?.name;

  const careItems: string[] = plan.care_items ?? [];
  const goals: string[] = plan.goals ?? [];
  const precautions: string[] = plan.precautions ?? [];
  const visitDays: string[] = plan.visit_days ?? [];

  const handleConsent = () => {
    Alert.alert(
      '서비스 계획 동의',
      '서비스 계획에 동의하시겠습니까?\n동의 후에는 서비스가 시작됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '동의합니다',
          onPress: async () => {
            try {
              await consentMutation.mutateAsync({ planId: plan.id });
              Alert.alert('완료', '서비스 계획에 동의하였습니다');
            } catch (error) {
              console.error('서비스 계획 동의 오류:', error);
              Alert.alert('오류', '동의 처리에 실패했습니다. 다시 시도해주세요.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={planQuery.isRefetching}
          onRefresh={() => planQuery.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {/* 헤더 */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            {patientName && <Text style={styles.patientName}>{patientName}</Text>}
            {orgName && <Text style={styles.orgName}>{orgName}</Text>}
            {nurseName && (
              <Text style={styles.nurseName}>담당: {nurseName}</Text>
            )}
          </View>
          <Badge
            text={getPlanStatusLabel(plan.status)}
            variant={getPlanStatusVariant(plan.status)}
            size="md"
          />
        </View>
      </Card>

      {/* 방문 스케줄 */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>방문 스케줄</Text>
        <View style={styles.scheduleGrid}>
          {plan.visit_frequency && (
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>방문 빈도</Text>
              <Text style={styles.scheduleValue}>{plan.visit_frequency}</Text>
            </View>
          )}
          {visitDays.length > 0 && (
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>방문 요일</Text>
              <Text style={styles.scheduleValue}>
                {visitDays.map((d) => WEEKDAY_MAP[d] ?? d).join(', ')}
              </Text>
            </View>
          )}
          {plan.preferred_time && (
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>시간대</Text>
              <Text style={styles.scheduleValue}>{plan.preferred_time}</Text>
            </View>
          )}
        </View>
      </Card>

      {/* 케어 항목 */}
      {careItems.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>케어 항목</Text>
          {careItems.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <View style={styles.listDot} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* 목표 */}
      {goals.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>목표</Text>
          {goals.map((goal, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.listNumber}>{idx + 1}</Text>
              <Text style={styles.listText}>{goal}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* 주의사항 */}
      {precautions.length > 0 && (
        <Card style={[styles.section, styles.precautionCard] as any}>
          <Text style={styles.precautionTitle}>주의사항</Text>
          {precautions.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={styles.precautionIcon}>⚠</Text>
              <Text style={styles.precautionText}>{item}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* 동의 상태 / 동의 버튼 */}
      {plan.guardian_consent && (
        <Card style={[styles.section, styles.consentedCard] as any}>
          <Text style={styles.consentedText}>
            ✓ 동의 완료 ({plan.consented_at ? new Date(plan.consented_at).toLocaleDateString('ko-KR') : ''})
          </Text>
        </Card>
      )}

      {plan.status === 'pending_consent' && !plan.guardian_consent && (
        <View style={styles.consentSection}>
          <Button
            title="서비스 계획에 동의합니다"
            onPress={handleConsent}
            loading={consentMutation.isPending}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </ScrollView>
  );
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
  nurseName: {
    ...typography.caption,
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },

  scheduleGrid: { gap: spacing.md },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleLabel: {
    ...typography.caption,
  },
  scheduleValue: {
    ...typography.bodyMedium,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  listDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginRight: spacing.md,
    marginTop: spacing.sm,
  },
  listNumber: {
    ...typography.label,
    color: colors.secondary,
    width: 24,
    marginRight: spacing.sm,
  },
  listText: {
    ...typography.koreanBody,
    flex: 1,
  },

  precautionCard: {
    backgroundColor: colors.redFlag.yellow.bg,
  },
  precautionTitle: {
    ...typography.bodyBold,
    color: colors.redFlag.yellow.text,
    marginBottom: spacing.md,
  },
  precautionIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  precautionText: {
    ...typography.koreanBody,
    color: colors.redFlag.yellow.text,
    flex: 1,
  },

  consentedCard: {
    backgroundColor: colors.vital.normal.bg,
  },
  consentedText: {
    ...typography.bodyMedium,
    color: colors.vital.normal.text,
    textAlign: 'center',
  },

  consentSection: {
    marginBottom: spacing.xl,
  },
});
