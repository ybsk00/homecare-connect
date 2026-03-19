import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '@/constants/theme';
import {
  getVitalStatus,
  getVitalStatusLabel,
  getVitalTypeLabel,
  getVitalUnit,
} from '@homecare/shared-utils';
import type { VitalRanges } from '@homecare/shared-utils';
import type { Vitals } from '@homecare/shared-types';

interface VitalChartProps {
  vitals: Vitals;
  compact?: boolean;
}

const VITAL_KEYS: (keyof VitalRanges)[] = [
  'systolic_bp',
  'diastolic_bp',
  'heart_rate',
  'temperature',
  'blood_sugar',
  'spo2',
];

function getVitalChipColors(status: string) {
  switch (status) {
    case 'normal':
      return colors.vital.normal;
    case 'warning':
    case 'low':
    case 'high':
      return colors.vital.warning;
    case 'critical':
    case 'very_high':
    case 'very_low':
      return colors.vital.critical;
    default:
      return colors.vital.normal;
  }
}

export function VitalChart({ vitals, compact = false }: VitalChartProps) {
  const entries = VITAL_KEYS.filter((key) => vitals[key] !== undefined && vitals[key] !== null);

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>측정된 바이탈 데이터가 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.compact]}>
      {entries.map((key) => {
        const value = vitals[key]!;
        const status = getVitalStatus(key, value);
        const chipColors = getVitalChipColors(status);
        const statusLabel = getVitalStatusLabel(status);
        const typeLabel = getVitalTypeLabel(key);
        const unit = getVitalUnit(key);

        return (
          <View key={key} style={[styles.item, compact && styles.itemCompact]}>
            <Text style={styles.itemLabel}>{typeLabel}</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.itemValue, { color: chipColors.text }]}>
                {key === 'temperature' ? value.toFixed(1) : value}
              </Text>
              <Text style={styles.itemUnit}>{unit}</Text>
            </View>
            {/* Vitality chip */}
            <View style={[styles.statusBadge, { backgroundColor: chipColors.bg }]}>
              <Text style={[styles.statusText, { color: chipColors.text }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        );
      })}

      {vitals.weight !== undefined && (
        <View style={[styles.item, compact && styles.itemCompact]}>
          <Text style={styles.itemLabel}>체중</Text>
          <View style={styles.valueRow}>
            <Text style={styles.itemValueNeutral}>{vitals.weight.toFixed(1)}</Text>
            <Text style={styles.itemUnit}>kg</Text>
          </View>
        </View>
      )}

      {vitals.respiration_rate !== undefined && (
        <View style={[styles.item, compact && styles.itemCompact]}>
          <Text style={styles.itemLabel}>호흡수</Text>
          <View style={styles.valueRow}>
            <Text style={styles.itemValueNeutral}>{vitals.respiration_rate}</Text>
            <Text style={styles.itemUnit}>회/분</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  compact: {
    gap: spacing.sm,
  },
  item: {
    width: '47%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemCompact: {
    width: '30%',
    padding: spacing.sm,
  },
  itemLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  itemValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  itemValueNeutral: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
  },
  itemUnit: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  statusBadge: {
    marginTop: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
  },
});
