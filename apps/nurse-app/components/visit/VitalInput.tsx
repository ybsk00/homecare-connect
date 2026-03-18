import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';
import {
  getVitalStatus,
  getVitalStatusColor,
  getVitalStatusLabel,
  getVitalTypeLabel,
  getVitalUnit,
  type VitalRanges,
  VITAL_RANGES,
} from '@homecare/shared-utils';

interface VitalInputProps {
  vitalType: keyof VitalRanges;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  optional?: boolean;
}

/** Map vital status to Curated Sanctuary colors */
function getSanctuaryStatusColor(status: string): string {
  switch (status) {
    case 'normal':
      return Colors.secondary; // Teal
    case 'warning':
    case 'caution':
      return Colors.tertiary; // Warm brown
    case 'critical':
    case 'danger':
      return '#BA1A1A'; // Soft red
    default:
      return Colors.onSurfaceVariant;
  }
}

function getSanctuaryStatusBg(status: string): string {
  switch (status) {
    case 'normal':
      return 'rgba(0, 106, 99, 0.10)';
    case 'warning':
    case 'caution':
      return 'rgba(50, 27, 0, 0.10)';
    case 'critical':
    case 'danger':
      return 'rgba(186, 26, 26, 0.10)';
    default:
      return 'rgba(66, 71, 78, 0.10)';
  }
}

export function VitalInput({ vitalType, value, onChange, optional = false }: VitalInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() ?? '');
  const [isFocused, setIsFocused] = useState(false);

  const label = getVitalTypeLabel(vitalType);
  const unit = getVitalUnit(vitalType);
  const range = VITAL_RANGES[vitalType];

  const status = value !== undefined ? getVitalStatus(vitalType, value) : null;
  const statusColor = status ? getSanctuaryStatusColor(status) : null;
  const statusBg = status ? getSanctuaryStatusBg(status) : null;
  const statusLabel = status ? getVitalStatusLabel(status) : null;

  const handleNumPadPress = useCallback(
    (digit: string) => {
      let newValue: string;
      if (digit === 'backspace') {
        newValue = inputValue.slice(0, -1);
      } else if (digit === '.') {
        if (inputValue.includes('.')) return;
        newValue = inputValue + '.';
      } else {
        newValue = inputValue + digit;
      }

      setInputValue(newValue);
      if (newValue === '' || newValue === '.') {
        onChange(undefined);
      } else {
        const num = parseFloat(newValue);
        if (!isNaN(num)) {
          onChange(num);
        }
      }
    },
    [inputValue, onChange],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange(undefined);
  }, [onChange]);

  // Determine glow style based on status
  const inputAreaGlow = statusColor
    ? {
        shadowColor: statusColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
      }
    : {};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {optional && (
            <Text style={styles.optional}>(\uC120\uD0DD)</Text>
          )}
        </View>
        <Text style={styles.rangeHint}>
          \uC815\uC0C1: {range.normal[0]}~{range.normal[1]} {unit}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.inputArea, inputAreaGlow]}
        onPress={() => setIsFocused(true)}
        activeOpacity={0.9}
      >
        <View style={styles.valueDisplay}>
          <Text
            style={[
              styles.valueText,
              statusColor ? { color: statusColor } : undefined,
              !inputValue ? styles.placeholder : undefined,
            ]}
          >
            {inputValue || '--'}
          </Text>
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        {status && (
          <View style={[styles.statusChip, { backgroundColor: statusBg! }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor! }]} />
            <Text style={[styles.statusText, { color: statusColor! }]}>
              {statusLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {isFocused && (
        <View style={styles.numPad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['.', '0', 'backspace'],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.numPadRow}>
              {row.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={[
                    styles.numPadButton,
                    digit === 'backspace' ? styles.numPadSpecial : undefined,
                  ]}
                  onPress={() => handleNumPadPress(digit)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.numPadText,
                      digit === 'backspace' ? styles.numPadSpecialText : undefined,
                    ]}
                  >
                    {digit === 'backspace' ? '\u232B' : digit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.numPadActions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Text style={styles.clearText}>{'\uC9C0\uC6B0\uAE30'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsFocused(false)}
            >
              <Text style={styles.doneText}>{'\uC644\uB8CC'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isFocused && (
        <TouchableOpacity
          style={styles.tapToEdit}
          onPress={() => setIsFocused(true)}
        >
          <Text style={styles.tapToEditText}>
            {'\uD0ED\uD558\uC5EC \uC785\uB825'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  optional: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginLeft: Spacing.xs,
  },
  rangeHint: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    minHeight: 72,
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valueText: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.onSurface,
  },
  placeholder: {
    color: Colors.outline,
  },
  unitText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    marginLeft: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  numPad: {
    marginTop: Spacing.lg,
  },
  numPadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  numPadButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.xs,
    backgroundColor: 'rgba(0, 32, 69, 0.06)',
    borderRadius: BorderRadius.md,
    minHeight: TouchTarget.minimum,
  },
  numPadSpecial: {
    backgroundColor: Colors.surfaceContainerHigh,
  },
  numPadText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  numPadSpecialText: {
    color: Colors.onSurfaceVariant,
  },
  numPadActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  clearButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  clearText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  doneText: {
    fontSize: FontSize.md,
    color: Colors.onPrimary,
    fontWeight: '700',
  },
  tapToEdit: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  tapToEditText: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontWeight: '600',
  },
});
