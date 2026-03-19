import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useNurseServicePlans } from '@/hooks/useServicePlans';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const STATUS_MAP: Record<string, { label: string; variant: 'teal' | 'navy' | 'warm' }> = {
  active: { label: '진행 중', variant: 'teal' },
  completed: { label: '완료', variant: 'navy' },
  suspended: { label: '중단', variant: 'warm' },
  draft: { label: '초안', variant: 'navy' },
};

const FREQUENCY_MAP: Record<string, string> = {
  daily: '매일',
  '2_per_week': '주 2회',
  '3_per_week': '주 3회',
  weekly: '주 1회',
  biweekly: '격주',
  monthly: '월 1회',
};

export default function ServicePlanListScreen() {
  const { plans, isLoading, refetch } = useNurseServicePlans();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return <Loading message={'서비스 계획을 불러오는 중...'} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {plans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {'등록된 서비스 계획이 없습니다.'}
          </Text>
        </View>
      ) : (
        plans.map((plan: any) => {
          const patient = plan.patient;
          const statusInfo = STATUS_MAP[plan.status] ?? {
            label: plan.status,
            variant: 'navy' as const,
          };
          const frequencyLabel =
            FREQUENCY_MAP[plan.visit_frequency] ?? plan.visit_frequency ?? '-';

          return (
            <Card
              key={plan.id}
              style={styles.planCard}
              onPress={() => router.push(`/service-plan/${plan.id}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>
                    {patient?.full_name ?? '환자'}
                  </Text>
                  {patient?.care_grade && (
                    <Text style={styles.careGrade}>
                      {'등급 '}{patient.care_grade}
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
                {patient?.primary_diagnosis && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{'주진단'}</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {patient.primary_diagnosis}
                    </Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{'방문 빈도'}</Text>
                  <Text style={styles.infoValue}>{frequencyLabel}</Text>
                </View>
                {plan.start_date && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{'시작일'}</Text>
                    <Text style={styles.infoValue}>{plan.start_date}</Text>
                  </View>
                )}
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
  planCard: {
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
    width: 80,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
});
