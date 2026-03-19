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

interface VitalDisplayProps {
  vitals: Vitals;
}

interface VitalItem {
  key: string;
  label: string;
  value: number;
  unit: string;
  status: string;
  chipColors: { bg: string; text: string };
  statusLabel: string;
}

function getChipColors(status: string) {
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

export function VitalDisplay({ vitals }: VitalDisplayProps) {
  const items: VitalItem[] = [];

  const vitalKeys: (keyof VitalRanges)[] = [
    'systolic_bp',
    'diastolic_bp',
    'heart_rate',
    'temperature',
    'blood_sugar',
    'spo2',
  ];

  for (const key of vitalKeys) {
    const val = vitals[key];
    if (val !== undefined && val !== null) {
      const status = getVitalStatus(key, val);
      items.push({
        key,
        label: getVitalTypeLabel(key),
        value: val,
        unit: getVitalUnit(key),
        status,
        chipColors: getChipColors(status),
        statusLabel: getVitalStatusLabel(status),
      });
    }
  }

  if (vitals.weight !== undefined) {
    items.push({
      key: 'weight',
      label: '체중',
      value: vitals.weight,
      unit: 'kg',
      status: 'normal',
      chipColors: { bg: 'transparent', text: colors.onSurface },
      statusLabel: '',
    });
  }

  if (vitals.respiration_rate !== undefined) {
    items.push({
      key: 'respiration_rate',
      label: '호흡수',
      value: vitals.respiration_rate,
      unit: '회/분',
      status: 'normal',
      chipColors: { bg: 'transparent', text: colors.onSurface },
      statusLabel: '',
    });
  }

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>바이탈 데이터 없음</Text>
      </View>
    );
  }

  // Blood pressure combined display
  const hasBP =
    vitals.systolic_bp !== undefined && vitals.diastolic_bp !== undefined;

  return (
    <View style={styles.container}>
      {hasBP && (
        <View style={styles.bpRow}>
          <Text style={styles.bpLabel}>혈압</Text>
          <View style={styles.bpValueRow}>
            <Text
              style={[
                styles.bpValue,
                { color: getChipColors(getVitalStatus('systolic_bp', vitals.systolic_bp!)).text },
              ]}
            >
              {vitals.systolic_bp}
            </Text>
            <Text style={styles.bpSeparator}>/</Text>
            <Text
              style={[
                styles.bpValue,
                { color: getChipColors(getVitalStatus('diastolic_bp', vitals.diastolic_bp!)).text },
              ]}
            >
              {vitals.diastolic_bp}
            </Text>
            <Text style={styles.bpUnit}>mmHg</Text>
          </View>
          {/* Vitality chip for BP */}
          <View
            style={[
              styles.bpChip,
              { backgroundColor: getChipColors(getVitalStatus('systolic_bp', vitals.systolic_bp!)).bg },
            ]}
          >
            <Text
              style={[
                styles.bpChipText,
                { color: getChipColors(getVitalStatus('systolic_bp', vitals.systolic_bp!)).text },
              ]}
            >
              {getVitalStatusLabel(getVitalStatus('systolic_bp', vitals.systolic_bp!))}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.grid}>
        {items
          .filter((item) => !hasBP || (item.key !== 'systolic_bp' && item.key !== 'diastolic_bp'))
          .map((item) => (
            <View key={item.key} style={styles.gridItem}>
              <Text style={styles.gridLabel}>{item.label}</Text>
              <Text style={[styles.gridValue, { color: item.chipColors.text }]}>
                {item.key === 'temperature' || item.key === 'weight'
                  ? item.value.toFixed(1)
                  : item.value}
              </Text>
              <Text style={styles.gridUnit}>{item.unit}</Text>
              {item.statusLabel !== '' && (
                <View style={[styles.vitChip, { backgroundColor: item.chipColors.bg }]}>
                  <Text style={[styles.vitChipText, { color: item.chipColors.text }]}>
                    {item.statusLabel}
                  </Text>
                </View>
              )}
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
  },
  bpRow: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  bpLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  bpValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  bpValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  bpSeparator: {
    fontSize: 22,
    color: colors.onSurfaceVariant,
    marginHorizontal: spacing.xs,
  },
  bpUnit: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.sm,
  },
  bpChip: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  bpChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '47%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  gridLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  gridValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  gridUnit: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  vitChip: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  vitChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
