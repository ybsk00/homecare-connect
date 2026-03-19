import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getVisitDetail } from '@homecare/supabase-client';
import { PatientBrief } from '@/components/patient/PatientBrief';
import { VisitStatusBadge } from '@/components/visit/VisitStatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { formatDate, formatDuration } from '@homecare/shared-utils';

interface VisitPatient {
  id: string;
  full_name: string;
  birth_date: string;
  gender: 'male' | 'female';
  address: string;
  address_detail: string | null;
  care_grade: string | null;
  mobility: string | null;
  primary_diagnosis: string | null;
  current_medications: unknown[];
  allergies: unknown[];
  special_notes: string | null;
  phone: string | null;
}

interface VisitServicePlan {
  id: string;
  care_items: unknown;
  goals: string | null;
  precautions: string | null;
}

export default function VisitDetailScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();

  const query = useQuery({
    queryKey: ['visitDetail', visitId],
    queryFn: async () => {
      return await getVisitDetail(supabase, visitId!);
    },
    enabled: !!visitId,
  });

  if (query.isLoading) {
    return <Loading message={'\uBC29\uBB38 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911...'} />;
  }

  const visit = query.data;
  if (!visit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {'\uBC29\uBB38 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'}
        </Text>
      </View>
    );
  }

  const patient = (visit as any).patient as VisitPatient | null;
  const plan = (visit as any).service_plan as VisitServicePlan | null;
  const isActionable =
    visit.status === 'scheduled' || visit.status === 'en_route';
  const isInProgress =
    visit.status === 'checked_in' || visit.status === 'in_progress';
  const existingRecord = Array.isArray(visit.visit_record)
    ? visit.visit_record[0]
    : visit.visit_record;

  const careItems: { item: string; category?: string }[] = (() => {
    if (!plan?.care_items) return [];
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Status header */}
      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <VisitStatusBadge status={visit.status} />
          <Text style={styles.dateText}>
            {formatDate(visit.scheduled_date)}
            {visit.scheduled_time ? ` ${visit.scheduled_time}` : ''}
          </Text>
        </View>
        <Text style={styles.durationText}>
          {'\uC608\uC0C1 \uC18C\uC694: '}{formatDuration(visit.estimated_duration_min)}
        </Text>
      </Card>

      {/* Patient info */}
      {patient && (
        <PatientBrief
          name={patient.full_name}
          birthDate={patient.birth_date}
          gender={patient.gender}
          careGrade={patient.care_grade}
          mobility={patient.mobility}
          diagnosis={patient.primary_diagnosis}
          allergies={patient.allergies as string[]}
          specialNotes={patient.special_notes}
        />
      )}

      {/* Goals & precautions — editorial layout */}
      {(plan?.goals || plan?.precautions) && (
        <Card style={styles.planCard}>
          {plan.goals && (
            <View style={styles.planSection}>
              <Text style={styles.planLabel}>{'\uBC29\uBB38 \uBAA9\uD45C'}</Text>
              <Text style={styles.planText}>{plan.goals}</Text>
            </View>
          )}
          {plan.precautions && (
            <View style={styles.precautionSection}>
              <Text style={styles.precautionLabel}>{'\uC8FC\uC758\uC0AC\uD56D'}</Text>
              <Text style={styles.planText}>{plan.precautions}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Care items preview */}
      {careItems.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>
            {'\uC218\uD589 \uD56D\uBAA9'} ({careItems.length})
          </Text>
          {careItems.slice(0, 5).map((ci, index) => (
            <View key={index} style={styles.careItem}>
              <View style={styles.careItemDot} />
              <Text style={styles.careItemText}>{ci.item}</Text>
            </View>
          ))}
          {careItems.length > 5 && (
            <Text style={styles.moreText}>
              +{careItems.length - 5}{'\uAC1C \uB354 \uBCF4\uAE30'}
            </Text>
          )}
        </Card>
      )}

      {/* Previous record */}
      {existingRecord && (
        <Card style={styles.recordCard}>
          <Text style={styles.sectionTitle}>{'\uC774\uC804 \uAE30\uB85D'}</Text>
          {existingRecord.nurse_note && (
            <Text style={styles.noteText}>{existingRecord.nurse_note}</Text>
          )}
        </Card>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {isActionable && (
          <Button
            title={'\uBC29\uBB38 \uC2DC\uC791 (\uCCB4\uD06C\uC778)'}
            onPress={() => router.push(`/visit/${visitId}/checkin`)}
            variant="primary"
            size="xl"
            fullWidth
          />
        )}
        {isInProgress && (
          <>
            <Button
              title={'\uBC14\uC774\uD0C8 \uC785\uB825'}
              onPress={() => router.push(`/visit/${visitId}/vitals`)}
              variant="primary"
              size="xl"
              fullWidth
            />
            <View style={{ height: Spacing.md }} />
            <Button
              title={'\uCCB4\uD06C\uC544\uC6C3'}
              onPress={() => router.push(`/visit/${visitId}/checkout`)}
              variant="tonal"
              size="lg"
              fullWidth
            />
          </>
        )}
      </View>
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
  statusCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dateText: {
    fontSize: FontSize.md,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  durationText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  planCard: {
    marginBottom: Spacing.lg,
  },
  planSection: {
    marginBottom: Spacing.lg,
  },
  planLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: Spacing.xs,
  },
  precautionSection: {
    backgroundColor: Colors.warningContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  precautionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.tertiary,
    marginBottom: Spacing.xs,
  },
  planText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  careItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  careItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
    marginRight: Spacing.md,
  },
  careItemText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    flex: 1,
  },
  moreText: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  recordCard: {
    marginTop: Spacing.lg,
  },
  noteText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },
});
