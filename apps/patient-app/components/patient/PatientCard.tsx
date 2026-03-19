import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, spacing, radius, typography } from '@/constants/theme';
import type { Tables } from '@homecare/shared-types';
import {
  formatCareGrade,
  formatMobility,
  formatServiceType,
  formatDate,
} from '@homecare/shared-utils';

interface PatientCardProps {
  patient: Tables<'patients'>;
  relationship?: string;
  selected?: boolean;
  onPress?: (patientId: string) => void;
}

export function PatientCard({ patient, relationship, selected, onPress }: PatientCardProps) {
  const age = new Date().getFullYear() - new Date(patient.birth_date).getFullYear();
  const genderLabel = patient.gender === 'male' ? '남' : '여';

  const statusVariant =
    patient.status === 'active' ? 'success' : patient.status === 'paused' ? 'warning' : 'neutral';
  const statusLabel =
    patient.status === 'active' ? '활동' : patient.status === 'paused' ? '일시중지' : '퇴원';

  return (
    <TouchableOpacity
      onPress={() => onPress?.(patient.id)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Card
        style={[
          styles.card,
          selected && styles.selected,
        ] as any}
      >
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{patient.full_name}</Text>
            <Text style={styles.info}>
              {age}세 {genderLabel}
            </Text>
          </View>
          <Badge text={statusLabel} variant={statusVariant} />
        </View>

        {/* Care grade as teal vitality chip */}
        {patient.care_grade && (
          <View style={styles.gradeRow}>
            <View style={styles.gradeChip}>
              <Text style={styles.gradeText}>{formatCareGrade(patient.care_grade)}</Text>
            </View>
            {patient.mobility && (
              <Text style={styles.mobilityText}>{formatMobility(patient.mobility)}</Text>
            )}
          </View>
        )}

        {relationship && (
          <Text style={styles.relationship}>관계: {relationship}</Text>
        )}

        <View style={styles.details}>
          {patient.primary_diagnosis && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>주진단</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {patient.primary_diagnosis}
              </Text>
            </View>
          )}
        </View>

        {patient.needed_services && patient.needed_services.length > 0 && (
          <View style={styles.services}>
            {patient.needed_services.map((svc) => (
              <Badge key={svc} text={formatServiceType(svc)} variant="primary" />
            ))}
          </View>
        )}

        <Text style={styles.address} numberOfLines={1}>
          {patient.address}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  selected: {
    // Tonal shift instead of border for selection
    backgroundColor: colors.surfaceContainerLow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  info: {
    ...typography.caption,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gradeChip: {
    backgroundColor: colors.vital.normal.bg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  mobilityText: {
    ...typography.caption,
  },
  relationship: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    maxWidth: 140,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  address: {
    ...typography.small,
  },
});
