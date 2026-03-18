import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge, getVisitStatusVariant } from '@/components/ui/Badge';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatVisitStatus, formatDateWithDay, formatDuration } from '@homecare/shared-utils';

interface VisitCardProps {
  visitId: string;
  scheduledDate: string;
  scheduledTime: string | null;
  status: string;
  estimatedDurationMin: number;
  nurseName?: string;
  nurseType?: string;
  patientName?: string;
  hasRecord?: boolean;
  onPress?: (visitId: string) => void;
}

export function VisitCard({
  visitId,
  scheduledDate,
  scheduledTime,
  status,
  estimatedDurationMin,
  nurseName,
  nurseType,
  patientName,
  hasRecord,
  onPress,
}: VisitCardProps) {
  const statusLabel = formatVisitStatus(status);
  const statusVariant = getVisitStatusVariant(status);
  const isCompleted = status === 'completed' || status === 'checked_out';

  const nurseTypeLabel =
    nurseType === 'nurse'
      ? '간호사'
      : nurseType === 'physio'
        ? '물리치료사'
        : nurseType === 'caregiver'
          ? '요양보호사'
          : nurseType === 'doctor'
            ? '의사'
            : '';

  return (
    <TouchableOpacity
      onPress={() => onPress?.(visitId)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Card style={styles.card}>
        {/* Navy accent stripe for scheduled, teal for completed */}
        <View
          style={[
            styles.accentStripe,
            { backgroundColor: isCompleted ? colors.secondary : colors.primary },
          ]}
        />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.dateSection}>
              <Text style={styles.date}>{formatDateWithDay(scheduledDate)}</Text>
              {scheduledTime && (
                <Text style={[styles.time, { color: isCompleted ? colors.secondary : colors.primary }]}>
                  {scheduledTime}
                </Text>
              )}
            </View>
            <Badge text={statusLabel} variant={statusVariant} />
          </View>

          {patientName && <Text style={styles.patient}>{patientName} 님</Text>}

          <View style={styles.infoRow}>
            {nurseName && (
              <Text style={styles.nurse}>
                {nurseTypeLabel} {nurseName}
              </Text>
            )}
            <Text style={styles.duration}>{formatDuration(estimatedDurationMin)}</Text>
          </View>

          {hasRecord && (
            <View style={styles.recordBadge}>
              <Text style={styles.recordText}>기록 완료</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  accentStripe: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  date: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  time: {
    fontSize: 16,
    fontWeight: '700',
  },
  patient: {
    ...typography.caption,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nurse: {
    ...typography.small,
    color: colors.onSurfaceVariant,
  },
  duration: {
    ...typography.small,
  },
  recordBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.vital.normal.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  recordText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
});
