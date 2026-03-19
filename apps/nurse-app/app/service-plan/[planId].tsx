import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useServicePlanDetail } from '@/hooks/useServicePlans';
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

const DAY_MAP: Record<string, string> = {
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
  const { plan: planRaw, isLoading } = useServicePlanDetail(planId);
  const plan = planRaw as any;

  if (isLoading) {
    return <Loading message={'서비스 계획을 불러오는 중...'} />;
  }

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {'서비스 계획을 찾을 수 없습니다.'}
        </Text>
      </View>
    );
  }

  const patient = (plan as any).patient;
  const statusInfo = STATUS_MAP[plan.status] ?? {
    label: plan.status,
    variant: 'navy' as const,
  };
  const frequencyLabel =
    FREQUENCY_MAP[plan.visit_frequency] ?? plan.visit_frequency ?? '-';
  const visitDays: string[] = Array.isArray(plan.visit_days)
    ? plan.visit_days
    : [];
  const visitDaysLabel = visitDays
    .map((d: string) => DAY_MAP[d] ?? d)
    .join(', ');

  const careItems: { item: string; category?: string }[] = (() => {
    if (!plan.care_items) return [];
    if (Array.isArray(plan.care_items)) return plan.care_items;
    if (typeof plan.care_items === 'object') {
      const result: { item: string; category?: string }[] = [];
      for (const [category, items] of Object.entries(plan.care_items)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            result.push({
              item: typeof item === 'string' ? item : String(item),
              category,
            });
          }
        }
      }
      return result;
    }
    return [];
  })();

  // 카테고리별 그룹핑
  const groupedItems = careItems.reduce(
    (acc, ci) => {
      const cat = ci.category ?? '기타';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ci.item);
      return acc;
    },
    {} as Record<string, string[]>,
  );

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

      {/* 방문 정보 */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{'방문 정보'}</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{'방문 빈도'}</Text>
            <Text style={styles.infoValue}>{frequencyLabel}</Text>
          </View>
          {visitDaysLabel && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{'방문 요일'}</Text>
              <Text style={styles.infoValue}>{visitDaysLabel}</Text>
            </View>
          )}
          {plan.start_date && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{'시작일'}</Text>
              <Text style={styles.infoValue}>{plan.start_date}</Text>
            </View>
          )}
          {plan.end_date && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{'종료일'}</Text>
              <Text style={styles.infoValue}>{plan.end_date}</Text>
            </View>
          )}
        </View>
      </Card>

      {/* 목표 */}
      {plan.goals && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{'목표'}</Text>
          <Text style={styles.bodyText}>{plan.goals}</Text>
        </Card>
      )}

      {/* 주의사항 */}
      {plan.precautions && (
        <Card style={styles.sectionCard}>
          <View style={styles.precautionContainer}>
            <Text style={styles.precautionTitle}>{'주의사항'}</Text>
            <Text style={styles.precautionText}>{plan.precautions}</Text>
          </View>
        </Card>
      )}

      {/* 케어 항목 */}
      {careItems.length > 0 && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {'케어 항목'} ({careItems.length})
          </Text>
          {Object.entries(groupedItems).map(([category, items]) => (
            <View key={category} style={styles.categoryGroup}>
              {Object.keys(groupedItems).length > 1 && (
                <Text style={styles.categoryLabel}>{category}</Text>
              )}
              {items.map((item, index) => (
                <View key={index} style={styles.checkItem}>
                  <View style={styles.checkbox} />
                  <Text style={styles.checkItemText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
        </Card>
      )}

      {/* 주소 */}
      {patient?.address && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{'방문 주소'}</Text>
          <Text style={styles.bodyText}>{patient.address}</Text>
        </Card>
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
  // Info grid
  infoGrid: {
    gap: Spacing.md,
  },
  infoItem: {
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
  // Precaution
  precautionContainer: {
    backgroundColor: Colors.warningContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  precautionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.tertiary,
    marginBottom: Spacing.xs,
  },
  precautionText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  // Care items
  categoryGroup: {
    marginBottom: Spacing.lg,
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: Spacing.sm,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    minHeight: 36,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.outline,
    marginRight: Spacing.md,
  },
  checkItemText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    flex: 1,
  },
});
