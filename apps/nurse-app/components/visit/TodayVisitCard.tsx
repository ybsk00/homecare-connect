import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VisitStatusBadge } from './VisitStatusBadge';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { formatCareGrade, formatDuration } from '@homecare/shared-utils';
import type { VisitWithPatient } from '@/stores/visit-store';

interface TodayVisitCardProps {
  visit: VisitWithPatient;
  index: number;
}

const careTypeMap: Record<string, string> = {
  intensive: '집중 관리',
  regular: '정기 방문',
  consultation: '상담',
};

export function TodayVisitCard({ visit, index }: TodayVisitCardProps) {
  const patient = visit.patient;
  const isActionable =
    visit.status === 'scheduled' || visit.status === 'en_route';
  const isInProgress =
    visit.status === 'checked_in' || visit.status === 'in_progress';
  const isCompleted =
    visit.status === 'completed' || visit.status === 'checked_out';

  const handlePress = () => {
    router.push(`/visit/${visit.id}`);
  };

  const handleStart = () => {
    router.push(`/visit/${visit.id}/checkin`);
  };

  const handleContinue = () => {
    router.push(`/visit/${visit.id}/vitals`);
  };

  return (
    <Card
      onPress={handlePress}
      style={[styles.card, isCompleted && styles.completedCard]}
    >
      {/* Header: Order number + patient info + status */}
      <View style={styles.header}>
        <View style={styles.orderCircle}>
          <Text style={styles.orderText}>
            {isCompleted ? '\u2713' : (visit.visit_order ?? index + 1)}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.patientName}>
            {patient?.full_name ?? '\uD658\uC790'}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {patient?.address ?? '\uC8FC\uC18C \uC5C6\uC74C'}
          </Text>
        </View>
        <VisitStatusBadge status={visit.status} />
      </View>

      {/* Care type chip + ETA */}
      <View style={styles.metaRow}>
        {patient?.care_grade && (
          <Badge
            label={formatCareGrade(patient.care_grade)}
            variant="teal"
            size="sm"
          />
        )}
        {(visit as any).care_type && (
          <Badge
            label={careTypeMap[(visit as any).care_type] ?? (visit as any).care_type}
            variant="teal"
            size="sm"
          />
        )}
        {visit.scheduled_time && (
          <View style={styles.etaContainer}>
            <Text style={styles.etaText}>
              {visit.scheduled_time}
            </Text>
            <Text style={styles.durationText}>
              {formatDuration(visit.estimated_duration_min)}
            </Text>
          </View>
        )}
      </View>

      {/* Diagnosis preview */}
      {patient?.primary_diagnosis && (
        <Text style={styles.diagnosis} numberOfLines={1}>
          {patient.primary_diagnosis}
        </Text>
      )}

      {/* Action buttons */}
      {isActionable && (
        <View style={styles.footer}>
          <Button
            title="\uBC29\uBB38 \uC2DC\uC791"
            onPress={handleStart}
            variant="primary"
            size="lg"
            fullWidth
          />
        </View>
      )}
      {isInProgress && (
        <View style={styles.footer}>
          <Button
            title="\uAE30\uB85D \uACC4\uC18D\uD558\uAE30"
            onPress={handleContinue}
            variant="tonal"
            size="lg"
            fullWidth
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
  },
  completedCard: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  orderCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 32, 69, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  orderText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  patientName: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  address: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  etaText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  durationText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginLeft: Spacing.sm,
  },
  diagnosis: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  footer: {
    marginTop: Spacing.sm,
  },
});
